import { toast } from '@src/services/toast';
import { modal } from '@src/services/modal';
import {
  makeAudioExtractionFailedMessage,
  makeCacheCleanupFailedMessage,
  makeCacheCleanupSuccessMessage,
  makeVideoPlaybackErrorMessage,
  makeWaveformExtractionFailedMessage,
} from '@src/services/media/toasts';
import { selectAudioTrack } from './dialogs/selectAudioTrack/selectAudioTrack';
import { IPC } from '@src/services/ipc/IPC';
import { TWaveformStatus } from '@src/types';
import {
  checkAudioPlayability,
  checkVideoDecodable,
  pathToFileUrl,
} from '@src/utils/checkVideoPlayability';
import { toErrorMessage } from '@src/utils/toErrorMessage';
import { Service } from '@src/services/Service';
import {
  selectActiveLineIndex,
  selectVideoFilePath,
  setActiveLineIndex,
  setVideoDurationMs,
  videoChanged,
} from './slice';

// The media service's operations: the video and audio elements (a muted video plus a separate
// audio element, always driven together), play/pause/seek, and loading a video. They read their
// own state with Service.select(localSelector), not the facade: index.ts builds the facade from this file,
// so importing it here would be a cycle.

// The editor imports this service (to seek and play), so its facade can't be imported here. The
// lines' timings are read from the raw state instead.
type TLineTimings = { editor: { lines: { start_time: number; end_time: number }[] } };
const lineTimings = () => Service.select((state: TLineTimings) => state.editor.lines);

// ── Elements and position ────────────────────────────────────────────────────

// DOM elements aren't store state. Neither is the playback position: it changes many times a
// second, and keeping it here means playback doesn't re-render whatever shows the video's state.
let videoElement: HTMLVideoElement | null = null;
let audioElement: HTMLAudioElement | null = null;
let currentTimeMs = 0;

export const getVideoElement = (): HTMLVideoElement | null => videoElement;
export const getAudioElement = (): HTMLAudioElement | null => audioElement;
export const getCurrentTimeMs = (): number => currentTimeMs;

// Audio is extracted per video into the main process's content-addressed cache, so for a video
// that was already imported this just resolves the cached file.
function attachExtractedAudio(path: string, element: HTMLAudioElement): void {
  IPC.media
    .extractAudio(path)
    .then((resolvedAudioPath) => {
      // The element may have been swapped or unmounted meanwhile
      if (audioElement === element) element.src = pathToFileUrl(resolvedAudioPath);
    })
    .catch((error) => {
      toast.push(makeAudioExtractionFailedMessage(toErrorMessage(error)));
    });
}

export function registerVideoElement(el: HTMLVideoElement | null): void {
  videoElement = el;
  const path = Service.select(selectVideoFilePath);
  if (el && path) {
    el.src = pathToFileUrl(path);
    el.muted = true;
  }
}

export function registerAudioElement(el: HTMLAudioElement | null): void {
  audioElement = el;
  const path = Service.select(selectVideoFilePath);
  if (el && path) attachExtractedAudio(path, el);
}

function loadVideoDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const el = document.createElement('video');
    el.preload = 'metadata';
    el.src = url;
    el.onloadedmetadata = () => {
      resolve(Math.round(el.duration * 1000));
      el.src = '';
    };
    el.onerror = reject;
  });
}

/** Switches to a video file (or none), with its audio when the path is known. The thumbnail and
 * waveform are set separately (`media.setVideoData`), since callers get them from the import or
 * reselect flow. */
export function loadVideo(path: string | null, audioPath?: string): void {
  Service.dispatch(videoChanged(path));
  const url = path ? pathToFileUrl(path) : '';
  if (videoElement) {
    videoElement.src = url;
    videoElement.muted = true;
  }
  if (audioElement) {
    audioElement.src = audioPath ? pathToFileUrl(audioPath) : '';
  }
  if (!path) return;

  loadVideoDuration(url)
    .then((ms) => Service.dispatch(setVideoDurationMs(ms)))
    .catch(() => Service.dispatch(setVideoDurationMs(null)));

  // Audio path wasn't already known (e.g. project reload, only videoPath is persisted) --
  // re-derive it via the same content-addressed cache the import flow already populated.
  if (!audioPath && audioElement) attachExtractedAudio(path, audioElement);
}

/** Records the playback position and updates the active line to the one playing at it. */
export function setCurrentTimeMs(ms: number): void {
  const time = ms < 0 ? 0 : ms;
  const index = lineTimings().findIndex((l) => l.start_time <= time && l.end_time >= time);
  const next = index >= 0 ? index : null;
  if (next !== Service.select(selectActiveLineIndex)) Service.dispatch(setActiveLineIndex(next));
  currentTimeMs = ms;
}

export function seekToMs(ms: number): void {
  setCurrentTimeMs(ms);
  const seconds = ms / 1000;
  if (videoElement) videoElement.currentTime = seconds;
  if (audioElement) audioElement.currentTime = seconds;
}

export function seekToLine(lineIndex: number | null): void {
  if (lineIndex == null) return;
  const line = lineTimings()[lineIndex];
  if (!line) return;
  seekToMs(line.start_time);
}

/** Back to the start, with no active line -- for a freshly opened project. */
export function resetPlayback(): void {
  currentTimeMs = 0;
  if (videoElement) videoElement.currentTime = 0;
  if (audioElement) audioElement.currentTime = 0;
  Service.dispatch(setActiveLineIndex(null));
}

// ── Playback ─────────────────────────────────────────────────────────────────

export function play(): void {
  videoElement?.play().catch(() => {});
  audioElement?.play().catch(() => {});
}

export function pause(): void {
  videoElement?.pause();
  audioElement?.pause();
}

export function playPause(): void {
  if (!videoElement) return;
  if (videoElement.paused) play();
  else pause();
}

/** Reports a video the player can't play. Closing the project and leaving the editor is up to
 * the caller, which owns navigation. */
export function reportVideoUnplayable(): void {
  toast.push(makeVideoPlaybackErrorMessage());
}

// ── Video processing ─────────────────────────────────────────────────────────

/** What the editor needs from a video, extracted by the main process. */
export type TProcessedVideo = {
  audioPath: string;
  waveformPeaks: number[];
  thumbnail: string | null;
  /** Displayed width / height, null when it couldn't be read */
  aspectRatio: number | null;
};

type TProcessVideoOptions = {
  /** Each step as it starts, then how it ended: SUCCESS or the failed step's status */
  onStatus?: (status: TWaveformStatus) => void;
  /** Checked after every step: once true, the run stops quietly, reporting nothing */
  isCancelled?: () => boolean;
};

/**
 * The one pipeline that prepares a video: checks it can be decoded, reads its metadata (thumbnail and aspect ratio, optional),
 * extracts its audio to AAC, checks the converted audio plays, and extracts the waveform. Reports
 * failures with a toast where there's something to tell; resolves null when a step failed or the
 * run was cancelled.
 */
export async function processVideo(
  videoPath: string,
  { onStatus, isCancelled = () => false }: TProcessVideoOptions = {}
): Promise<TProcessedVideo | null> {
  const fail = (status: TWaveformStatus, report?: () => void): null => {
    if (isCancelled()) return null;
    onStatus?.(status);
    report?.();
    return null;
  };

  onStatus?.(TWaveformStatus.LOADING);
  try {
    await checkVideoDecodable(videoPath);
  } catch {
    return fail(TWaveformStatus.UNSUPPORTED_VIDEO);
  }
  if (isCancelled()) return null;

  const metadata = await IPC.media.getVideoMetadata(videoPath).catch(() => null);
  if (isCancelled()) return null;

  // The original audio isn't pre-checked for native playability: codecs Chromium can't play (e.g.
  // EAC-3) are exactly what this conversion fixes. The converted file is checked instead.
  onStatus?.(TWaveformStatus.EXTRACTING_AUDIO);
  let audioPath: string;
  try {
    audioPath = await IPC.media.extractAudio(videoPath);
  } catch (error) {
    return fail(TWaveformStatus.AUDIO_EXTRACTION_FAILED, () =>
      toast.push(makeAudioExtractionFailedMessage(toErrorMessage(error)))
    );
  }
  if (isCancelled()) return null;

  try {
    await checkAudioPlayability(audioPath);
  } catch {
    return fail(TWaveformStatus.UNPLAYABLE_CONVERTED_AUDIO);
  }
  if (isCancelled()) return null;

  let waveformPeaks: number[];
  try {
    waveformPeaks = await IPC.media.extractWaveformPeaks(videoPath);
  } catch (error) {
    return fail(TWaveformStatus.ERROR, () =>
      toast.push(makeWaveformExtractionFailedMessage(toErrorMessage(error)))
    );
  }
  if (isCancelled()) return null;

  onStatus?.(TWaveformStatus.SUCCESS);
  return {
    audioPath,
    waveformPeaks,
    thumbnail: metadata?.thumbnail ?? null,
    aspectRatio: metadata?.aspectRatio ?? null,
  };
}

// ── User actions ─────────────────────────────────────────────────────────────

/** Cleans the media cache on request (the Settings button), behind a loader, and reports the
 * outcome with a toast. The silent housekeeping after a scan or a video change is
 * folder.cleanupMediaCache. */
export async function cleanMediaCache(): Promise<void> {
  try {
    await modal.load({ messages: [] }, IPC.media.cleanupCache());
    toast.push(makeCacheCleanupSuccessMessage());
  } catch {
    toast.push(makeCacheCleanupFailedMessage());
  }
}

/** Asks which of the open video's audio tracks to use; resolves its id, or null on Cancel or
 * without a video. Applying the chosen track isn't wired yet. */
export async function pickAudioTrack(): Promise<number | null> {
  const path = Service.select(selectVideoFilePath);
  return path ? selectAudioTrack(path) : null;
}

import { toast } from '@src/services/toast';
import { modal } from '@src/services/modal';
import {
  makeAudioExtractionFailedMessage,
  makeCacheCleanupFailedMessage,
  makeCacheCleanupSuccessMessage,
  makeVideoPlaybackErrorMessage,
} from '@src/services/media/toasts';
import type { TAudioTrack } from '@bridge/definitions/audioTrack';
import { IPC } from '@src/services/ipc/IPC';
import { getTrackOptionLabel } from './dialogs/selectAudioTrack/trackLabels';
import { pathToFileUrl } from '@src/utils/checkVideoPlayability';
import { toErrorMessage } from '@src/utils/toErrorMessage';
import { Service } from '@src/services/Service';
import {
  selectActiveLineIndex,
  selectAudioTrackId,
  selectVideoFilePath,
  setActiveLineIndex,
  setAudioTrack,
  setVideoData,
  setVideoDurationMs,
  setWaveformPeaks,
  videoChanged,
} from './slice';
import { pickVideoAudioTrack, type TAudioTrackData, type TVideoSelection } from './videoFlow';

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

// Audio is extracted per video and track into the main process's content-addressed cache, so for
// a video that was already picked this just resolves the cached file.
function attachExtractedAudio(path: string, element: HTMLAudioElement): void {
  IPC.media
    .extractAudio(path, Service.select(selectAudioTrackId) ?? undefined)
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

// Switches to a video file (or none), with its audio when the path is known. The thumbnail,
// waveform and track are set by applyVideo, which is the only caller.
function loadVideo(path: string | null, audioPath?: string): void {
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

  // Audio path wasn't already known -- re-derive it via the same content-addressed cache the
  // selection flow already populated.
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

// ── Applying a selection ─────────────────────────────────────────────────────

/** Shows a complete video selection (from media.pickVideo or loadSavedVideo) in the player, or no
 * video for null. Only the store: persisting it is the caller's (the project service's) job. */
export function applyVideo(selection: TVideoSelection | null): void {
  loadVideo(selection?.videoPath ?? null, selection?.audioPath);
  if (!selection) return;
  Service.dispatch(
    setVideoData({
      thumbnail: selection.thumbnail,
      aspectRatio: selection.aspectRatio,
      waveformPeaks: selection.waveformPeaks,
    })
  );
  Service.dispatch(
    setAudioTrack({ track: selection.audioTrack, count: selection.audioTrackCount })
  );
}

/** Switches the open video to another of its audio tracks (from media.pickAudioTrack), keeping the
 * playback position. Paused first, so the new audio can't start out of sync with the video. */
export function applyAudioTrack(track: TAudioTrackData): void {
  pause();
  Service.dispatch(setAudioTrack({ track: track.audioTrack }));
  Service.dispatch(setWaveformPeaks(track.waveformPeaks));
  if (audioElement) {
    audioElement.src = pathToFileUrl(track.audioPath);
    audioElement.currentTime = currentTimeMs / 1000;
  }
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

/** Asks for another of the open video's audio tracks and extracts it; resolves its data, or null
 * on Cancel, on failure, or without a video. Applying it (media.applyAudioTrack) and persisting it
 * are the caller's. */
export async function pickAudioTrack(): Promise<TAudioTrackData | null> {
  const path = Service.select(selectVideoFilePath);
  return path ? pickVideoAudioTrack(path, Service.select(selectAudioTrackId)) : null;
}

/** The track as the player's audio button shows it: id, language when known, and title (or a
 * translated "Unnamed") -- the same label the track popup lists it with */
export function getAudioTrackLabel(track: TAudioTrack): string {
  return getTrackOptionLabel(track);
}

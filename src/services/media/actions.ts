import { pushMessage } from '@providers/bridges/messages';
import { emitAudioExtractionFailedMessage, emitVideoPlaybackErrorMessage } from '@src/messages';
import { IPC } from '@src/services/ipc/IPC';
import { pathToFileUrl } from '@src/utils/checkVideoPlayability';
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
      emitAudioExtractionFailedMessage(pushMessage, toErrorMessage(error));
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
  emitVideoPlaybackErrorMessage(pushMessage);
}

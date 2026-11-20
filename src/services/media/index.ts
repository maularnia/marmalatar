import { Service } from '@src/services/Service';
import { loadSavedVideo, pickVideo } from './videoFlow';
import { confirmVideoBundleLost } from './dialogs/flowFailed/confirmFlowFailed';
import {
  applyAudioTrack,
  applyVideo,
  cleanMediaCache,
  clearVideo,
  getAudioElement,
  getAudioTrackLabel,
  getCurrentTimeMs,
  getVideoElement,
  pause,
  play,
  playPause,
  pickAudioTrack,
  registerAudioElement,
  registerVideoElement,
  reportVideoUnplayable,
  resetPlayback,
  seekToLine,
  seekToMs,
  setCurrentTimeMs,
  setBundleLostHandler,
} from './actions';
import {
  selectActiveLineIndex,
  selectThumbnail,
  selectAspectRatio,
  selectAudioTrack,
  selectAudioTrackCount,
  selectAudioTrackId,
  selectVideoDurationMs,
  selectVideoFilePath,
  selectWaveformPeaks,
  setActiveLineIndex,
} from './slice';

// The media service: the open project's video file, its duration, thumbnail and waveform, the
// video and audio elements, playback and seeking, and the line playing at the current position.
// This file is its only entry point: the slice lives in slice.ts, the operations in actions.ts.

export { default as mediaReducer } from './slice';
export type { TVideoSelection } from './videoFlow';

export const media = new Service('media', {
  actions: {
    setActiveLineIndex,
  },
  selectors: {
    selectActiveLineIndex,
    selectThumbnail,
    selectAspectRatio,
    selectAudioTrack,
    selectAudioTrackCount,
    selectAudioTrackId,
    selectVideoDurationMs,
    selectVideoFilePath,
    selectWaveformPeaks,
  },
  functions: {
    applyAudioTrack,
    applyVideo,
    clearVideo,
    confirmVideoBundleLost,
    setBundleLostHandler,
    cleanMediaCache,
    getAudioElement,
    getAudioTrackLabel,
    getCurrentTimeMs,
    getVideoElement,
    loadSavedVideo,
    pause,
    play,
    playPause,
    pickAudioTrack,
    pickVideo,
    registerAudioElement,
    registerVideoElement,
    reportVideoUnplayable,
    resetPlayback,
    seekToLine,
    seekToMs,
    setCurrentTimeMs,
  },
});

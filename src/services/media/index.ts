import { Service } from '@src/services/Service';
import {
  cleanMediaCache,
  getAudioElement,
  getCurrentTimeMs,
  getVideoElement,
  loadVideo,
  pause,
  play,
  playPause,
  pickAudioTrack,
  processVideo,
  registerAudioElement,
  registerVideoElement,
  reportVideoUnplayable,
  resetPlayback,
  seekToLine,
  seekToMs,
  setCurrentTimeMs,
} from './actions';
import {
  clearVideo,
  selectActiveLineIndex,
  selectThumbnail,
  selectVideoDurationMs,
  selectVideoFilePath,
  selectWaveformPeaks,
  setActiveLineIndex,
  setVideoData,
  setVideoFilePath,
} from './slice';

// The media service: the open project's video file, its duration, thumbnail and waveform, the
// video and audio elements, playback and seeking, and the line playing at the current position.
// This file is its only entry point: the slice lives in slice.ts, the operations in actions.ts.

export { default as mediaReducer } from './slice';

export const media = new Service('media', {
  actions: {
    clearVideo,
    setActiveLineIndex,
    setVideoData,
    setVideoFilePath,
  },
  selectors: {
    selectActiveLineIndex,
    selectThumbnail,
    selectVideoDurationMs,
    selectVideoFilePath,
    selectWaveformPeaks,
  },
  functions: {
    cleanMediaCache,
    getAudioElement,
    getCurrentTimeMs,
    getVideoElement,
    loadVideo,
    pause,
    play,
    playPause,
    pickAudioTrack,
    processVideo,
    registerAudioElement,
    registerVideoElement,
    reportVideoUnplayable,
    resetPlayback,
    seekToLine,
    seekToMs,
    setCurrentTimeMs,
  },
});

import type { TAudioTrack } from '@bridge/definitions/audioTrack';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { folder } from '@src/services/folder';

// The open project's video: which file, its duration, thumbnail, aspect ratio and waveform, and the line playing
// at the current position. The position itself isn't here: it changes many times a second during
// playback, so it's a module variable in actions.ts, read on demand (media.getCurrentTimeMs()).
type MediaState = {
  // Persisted per project, with the other device preferences (see project/autosave.ts)
  videoFilePath: string | null;
  videoDurationMs: number | null;
  thumbnail: string | null;
  // Displayed width / height; null until known, or when the video's size couldn't be read
  aspectRatio: number | null;
  waveformPeaks: number[];
  // The audio track played with the video (its id, ffprobe's stream index, is persisted per
  // project; the rest labels it in the player) and how many the video has, so the player offers a
  // choice only when there is one
  audioTrack: TAudioTrack | null;
  audioTrackCount: number;
  // The line whose time span contains the playback position
  activeLineIndex: number | null;
};

const initialState: MediaState = {
  videoFilePath: null,
  videoDurationMs: null,
  thumbnail: null,
  aspectRatio: null,
  waveformPeaks: [],
  audioTrack: null,
  audioTrackCount: 0,
  activeLineIndex: null,
};

const mediaSlice = createSlice({
  name: 'media',
  initialState,
  reducers: {
    setVideoDurationMs(state, action: PayloadAction<number | null>) {
      state.videoDurationMs = action.payload;
    },
    setVideoData(
      state,
      action: PayloadAction<{
        thumbnail: string | null;
        aspectRatio: number | null;
        waveformPeaks: number[];
      }>
    ) {
      state.thumbnail = action.payload.thumbnail;
      state.aspectRatio = action.payload.aspectRatio;
      state.waveformPeaks = action.payload.waveformPeaks;
    },
    setAudioTrack(state, action: PayloadAction<{ track: TAudioTrack | null; count?: number }>) {
      state.audioTrack = action.payload.track;
      if (action.payload.count !== undefined) state.audioTrackCount = action.payload.count;
    },
    setWaveformPeaks(state, action: PayloadAction<number[]>) {
      state.waveformPeaks = action.payload;
    },
    // A new file: what was derived from the previous one no longer applies
    videoChanged(state, action: PayloadAction<string | null>) {
      state.videoFilePath = action.payload;
      state.videoDurationMs = null;
      state.thumbnail = null;
      state.aspectRatio = null;
      state.waveformPeaks = [];
      state.audioTrack = null;
      state.audioTrackCount = 0;
    },
    setActiveLineIndex(state, action: PayloadAction<number | null>) {
      state.activeLineIndex = action.payload;
    },
    clearVideo(): MediaState {
      return initialState;
    },
  },
  extraReducers(builder) {
    // Another folder: the open project, and so its video, is closed
    builder.addCase(folder.pathChanged, (): MediaState => initialState);
  },
  selectors: {
    selectVideoFilePath: (state) => state.videoFilePath,
    selectVideoDurationMs: (state) => state.videoDurationMs,
    selectThumbnail: (state) => state.thumbnail,
    selectAspectRatio: (state) => state.aspectRatio,
    selectWaveformPeaks: (state) => state.waveformPeaks,
    selectAudioTrack: (state) => state.audioTrack,
    selectAudioTrackId: (state) => state.audioTrack?.id ?? null,
    selectAudioTrackCount: (state) => state.audioTrackCount,
    selectActiveLineIndex: (state) => state.activeLineIndex,
  },
});

export const {
  setVideoDurationMs,
  setVideoData,
  setAudioTrack,
  setWaveformPeaks,
  videoChanged,
  setActiveLineIndex,
  clearVideo,
} = mediaSlice.actions;

export const {
  selectVideoFilePath,
  selectVideoDurationMs,
  selectThumbnail,
  selectAspectRatio,
  selectWaveformPeaks,
  selectAudioTrack,
  selectAudioTrackId,
  selectAudioTrackCount,
  selectActiveLineIndex,
} = mediaSlice.selectors;

export default mediaSlice.reducer;

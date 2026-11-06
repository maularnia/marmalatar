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
  // The line whose time span contains the playback position
  activeLineIndex: number | null;
};

const initialState: MediaState = {
  videoFilePath: null,
  videoDurationMs: null,
  thumbnail: null,
  aspectRatio: null,
  waveformPeaks: [],
  activeLineIndex: null,
};

const mediaSlice = createSlice({
  name: 'media',
  initialState,
  reducers: {
    setVideoFilePath(state, action: PayloadAction<string | null>) {
      state.videoFilePath = action.payload;
    },
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
    // A new file: what was derived from the previous one no longer applies
    videoChanged(state, action: PayloadAction<string | null>) {
      state.videoFilePath = action.payload;
      state.videoDurationMs = null;
      state.thumbnail = null;
      state.aspectRatio = null;
      state.waveformPeaks = [];
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
    selectActiveLineIndex: (state) => state.activeLineIndex,
  },
});

export const {
  setVideoFilePath,
  setVideoDurationMs,
  setVideoData,
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
  selectActiveLineIndex,
} = mediaSlice.selectors;

export default mediaSlice.reducer;

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TLanguage } from '@src/types';

type ProjectState = {
  currentProjectFilePath: string | null;
  projectId: string | null;
  projectName: string | null;
  emoji: string | null;
  videoFilePath: string | null;
  sourceLanguage: TLanguage | null;
  targetLanguage: TLanguage | null;
  editorMode: 'edit' | 'translate';
};

const initialState: ProjectState = {
  currentProjectFilePath: null,
  projectId: null,
  projectName: null,
  emoji: null,
  videoFilePath: null,
  sourceLanguage: null,
  targetLanguage: null,
  editorMode: 'translate',
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setCurrentProjectFilePath(state, action: PayloadAction<string | null>) {
      state.currentProjectFilePath = action.payload;
    },
    setProjectId(state, action: PayloadAction<string | null>) {
      state.projectId = action.payload;
    },
    setProjectName(state, action: PayloadAction<string | null>) {
      state.projectName = action.payload;
    },
    setProjectEmoji(state, action: PayloadAction<string | null>) {
      state.emoji = action.payload;
    },
    setVideoFilePath(state, action: PayloadAction<string | null>) {
      state.videoFilePath = action.payload;
    },
    setProjectSourceLanguage(state, action: PayloadAction<TLanguage | null>) {
      state.sourceLanguage = action.payload;
    },
    setProjectTargetLanguage(state, action: PayloadAction<TLanguage | null>) {
      state.targetLanguage = action.payload;
    },
    setEditorMode(state, action: PayloadAction<'edit' | 'translate'>) {
      state.editorMode = action.payload;
    },
    resetProject(): ProjectState {
      return initialState;
    },
  },
  selectors: {
    selectCurrentProjectFilePath: (state) => state.currentProjectFilePath,
    selectProjectId: (state) => state.projectId,
    selectProjectName: (state) => state.projectName,
    selectVideoFilePath: (state) => state.videoFilePath,
    selectProjectSourceLanguage: (state) => state.sourceLanguage,
    selectProjectTargetLanguage: (state) => state.targetLanguage,
    selectEditorMode: (state) => state.editorMode,
    selectIsEditMode: (state) => state.editorMode === 'edit',
    selectIsProjectOpen: (state) => state.projectId !== null,
  },
});

export const {
  setCurrentProjectFilePath,
  setProjectId,
  setProjectName,
  setProjectEmoji,
  setVideoFilePath,
  setProjectSourceLanguage,
  setProjectTargetLanguage,
  setEditorMode,
  resetProject,
} = projectSlice.actions;

export const {
  selectCurrentProjectFilePath,
  selectProjectId,
  selectProjectName,
  selectVideoFilePath,
  selectProjectSourceLanguage,
  selectProjectTargetLanguage,
  selectEditorMode,
  selectIsEditMode,
  selectIsProjectOpen,
} = projectSlice.selectors;

export default projectSlice.reducer;

import { combineReducers } from '@reduxjs/toolkit';
import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import settingsReducer from './slices/settings';
import projectReducer from './slices/project';
import editorReducer from './slices/editor';
import promptReducer from './slices/prompt';
import workingFolderReducer from './slices/workingFolder';
import aiPromptEditorReducer from './slices/aiPromptEditor';
import overlaysReducer from './slices/overlays';
import aiReducer from './slices/ai';

export const rootReducer = combineReducers({
  settings: settingsReducer,
  project: projectReducer,
  editor: editorReducer,
  prompt: promptReducer,
  workingFolder: workingFolderReducer,
  aiPromptEditor: aiPromptEditorReducer,
  overlays: overlaysReducer,
  ai: aiReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = ThunkDispatch<RootState, undefined, UnknownAction>;

import { combineReducers } from '@reduxjs/toolkit';
import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import appReducer from './slices/app';
import projectReducer from './slices/project';
import editorReducer from './slices/editor';
import promptReducer from './slices/prompt';
import workingFolderReducer from './slices/workingFolder';
import aiPromptEditorReducer from './slices/aiPromptEditor';
import overlaysReducer from './slices/overlays';
import aiTranslationReducer from './slices/aiTranslation';

export const rootReducer = combineReducers({
  app: appReducer,
  project: projectReducer,
  editor: editorReducer,
  prompt: promptReducer,
  workingFolder: workingFolderReducer,
  aiPromptEditor: aiPromptEditorReducer,
  overlays: overlaysReducer,
  aiTranslation: aiTranslationReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = ThunkDispatch<RootState, undefined, UnknownAction>;

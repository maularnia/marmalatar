import { combineReducers } from '@reduxjs/toolkit';
import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { settingsReducer } from '@src/services/settings';
import { projectReducer } from '@src/services/project';
import { editorReducer } from '@src/services/project';
import { promptReducer } from '@src/services/prompt';
import { folderReducer } from '@src/services/folder';
import { glossaryReducer } from '@src/services/glossary';
import { aiReducer } from '@src/services/ai';
import { mediaReducer } from '@src/services/media';
import { menuReducer } from '@src/services/menu';

export const rootReducer = combineReducers({
  settings: settingsReducer,
  project: projectReducer,
  editor: editorReducer,
  prompt: promptReducer,
  folder: folderReducer,
  glossary: glossaryReducer,
  ai: aiReducer,
  media: mediaReducer,
  menu: menuReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = ThunkDispatch<RootState, undefined, UnknownAction>;

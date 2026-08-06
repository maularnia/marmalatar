import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from './root';
import type { RootState } from './root';
import { persistProjectStateMiddleware } from './persistProjectState';
import { persistEditorStateMiddleware } from './persistEditorState';
import { persistProjectProgressMiddleware } from './persistProjectProgress';

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(
      persistProjectStateMiddleware.middleware,
      persistEditorStateMiddleware.middleware,
      persistProjectProgressMiddleware.middleware
    ),
});

/** Reads a selector's result from the current Redux state without subscribing to it -- for event
 * handlers, callbacks, and other imperative code that only needs a value at the moment it runs,
 * not on every change. */
export const fromCurrentStore = <T>(selector: (state: RootState) => T): T =>
  selector(store.getState());

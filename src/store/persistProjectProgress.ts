import { createListenerMiddleware } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from './root';
import { selectTranslationProgress } from './slices/editor';
import { persistProjectProgress } from './slices/disc';

export const persistProjectProgressMiddleware = createListenerMiddleware();

persistProjectProgressMiddleware.startListening({
  predicate: (_action, currentState, previousState) =>
    selectTranslationProgress(currentState as RootState) !==
    selectTranslationProgress(previousState as RootState),

  effect: async (_action, api) => {
    api.cancelActiveListeners();
    // Short relative to the 1500ms content-autosave debounce -- the payload here is a
    // single float, cheap enough to persist promptly ("immediately" per requirements).
    await api.delay(400);

    const state = api.getState() as RootState;
    const { projectId, currentProjectFilePath: filePath } = state.project;
    if (!projectId || !filePath) return;

    await (api.dispatch as AppDispatch)(
      persistProjectProgress(filePath, selectTranslationProgress(state))
    );
  },
});

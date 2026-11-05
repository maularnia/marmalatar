import { api } from '@store/createApi';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AppDispatch } from '@store/root';

export enum TOverlay {
  PROMPT_TEMPLATE = 'promptTemplate',
  GLOSSARY = 'glossary',
  SETTINGS = 'settings',
  EXPORT = 'export',
}

type OverlaysState = {
  currentOverlay: TOverlay | null;
};

const initialState: OverlaysState = {
  currentOverlay: null,
};

const overlaysSlice = createSlice({
  name: 'overlays',
  initialState,
  reducers: {
    setCurrentOverlay(state, action: PayloadAction<TOverlay | null>) {
      state.currentOverlay = action.payload;
    },
    closeAllOverlays(state) {
      state.currentOverlay = null;
    },
  },
  selectors: {
    selectCurrentOverlay: (state) => state.currentOverlay,
  },
});

const { setCurrentOverlay, closeAllOverlays } = overlaysSlice.actions;
const { selectCurrentOverlay } = overlaysSlice.selectors;
export default overlaysSlice.reducer;

// ── Thunks ───────────────────────────────────────────────────────────────────

// The prompt template and glossary editors close themselves when another overlay opens
const openSettingsOverlay =
  () =>
  (dispatch: AppDispatch): void => {
    dispatch(setCurrentOverlay(TOverlay.SETTINGS));
  };

const openExportOverlay =
  () =>
  (dispatch: AppDispatch): void => {
    dispatch(setCurrentOverlay(TOverlay.EXPORT));
  };

// ── API ──────────────────────────────────────────────────────────────────────

export const overlays = api('overlay', {
  actions: {
    closeAllOverlays,
    setCurrentOverlay,
  },
  thunks: {
    openExportOverlay,
    openSettingsOverlay,
  },
  selectors: {
    selectCurrentOverlay,
  },
});

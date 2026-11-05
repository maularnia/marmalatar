import { api } from '@store/createApi';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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

// ── API ──────────────────────────────────────────────────────────────────────

export const overlays = api('overlay', {
  actions: {
    closeAllOverlays,
    setCurrentOverlay,
  },
  selectors: {
    selectCurrentOverlay,
  },
});

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
    closeOverlays(state) {
      state.currentOverlay = null;
    },
  },
  selectors: {
    selectCurrentOverlay: (state) => state.currentOverlay,
  },
});

export const { setCurrentOverlay, closeOverlays } = overlaysSlice.actions;
export const { selectCurrentOverlay } = overlaysSlice.selectors;
export default overlaysSlice.reducer;

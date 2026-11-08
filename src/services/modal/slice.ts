import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { TModalId } from './types';

// The open modal windows, in render order. Only what's serializable lives here: each window's
// content component, buttons and pending promise are in registry.ts, keyed by the same id.

type TModalWindow = {
  id: TModalId;
  // A confirm window has actions and is answered by the user; an info window has none and closes
  // when its promise settles
  kind: 'confirm' | 'info';
  isValid: boolean;
  animate: boolean;
};

type ModalState = {
  windows: TModalWindow[];
};

const initialState: ModalState = {
  windows: [],
};

const modalSlice = createSlice({
  name: 'modal',
  initialState,
  reducers: {
    modalOpened(state, action: PayloadAction<TModalWindow>) {
      if (!state.windows.some((w) => w.id === action.payload.id))
        state.windows.push(action.payload);
    },
    // Takes the window out of the rendered list; its exit animation still runs after this
    modalClosed(state, action: PayloadAction<TModalId>) {
      state.windows = state.windows.filter((w) => w.id !== action.payload);
    },
    modalValidityChanged(state, action: PayloadAction<{ id: TModalId; isValid: boolean }>) {
      const window = state.windows.find((w) => w.id === action.payload.id);
      if (window) window.isValid = action.payload.isValid;
    },
  },
  selectors: {
    selectModalWindows: (state) => state.windows,
    selectIsModalOpen: (state) => state.windows.length > 0,
  },
});

export const { modalOpened, modalClosed, modalValidityChanged } = modalSlice.actions;

export const { selectModalWindows, selectIsModalOpen } = modalSlice.selectors;

export default modalSlice.reducer;

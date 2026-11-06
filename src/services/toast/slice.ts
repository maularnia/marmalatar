import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { TMessageType } from '@src/types';
import type { TToastId } from './types';

// The toasts on screen, in the order they were pushed. Only what's serializable lives here: each
// toast's message (which may be a ReactNode) is in registry.ts, keyed by the same id.

type TToast = {
  id: TToastId;
  type: TMessageType;
  title: string;
};

type ToastState = {
  toasts: TToast[];
};

const initialState: ToastState = {
  toasts: [],
};

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    toastPushed(state, action: PayloadAction<TToast>) {
      state.toasts.push(action.payload);
    },
    toastDismissed(state, action: PayloadAction<TToastId>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
  selectors: {
    selectToastList: (state) => state.toasts,
  },
});

export const { toastPushed, toastDismissed } = toastSlice.actions;

export const { selectToastList } = toastSlice.selectors;

export default toastSlice.reducer;

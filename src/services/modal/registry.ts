import type { TButtonProps } from '@ui-toolkit/Button/types';
import type { ReactNode } from 'react';
import type { TModalId } from './types';

// The parts of an open window that can't be in the store: its content (already bound to the
// caller's props), its buttons, and what answers the caller. Keyed by the window's id in the slice.

export type TModalEntry = {
  render: (onValidChange: (isValid: boolean) => void) => ReactNode;
  confirmButton?: TButtonProps;
  dismissButton?: TButtonProps;
  // Confirm windows only
  onConfirm?: () => void;
  onDismiss?: () => void;
};

export const modalEntries = new Map<TModalId, TModalEntry>();

// Run once the closed windows have finished their exit animation, so callers continue only after
// the window is gone
export const pendingExitCallbacks = new Map<TModalId, () => void>();

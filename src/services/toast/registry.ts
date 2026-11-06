import type { ReactNode } from 'react';
import type { TToastId } from './types';

// Each toast's message, which may be a ReactNode and so can't be in the store. Keyed by the
// toast's id in the slice.
export const toastMessages = new Map<TToastId, ReactNode>();

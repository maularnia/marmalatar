import { createConfirmWindow } from '@providers/ConfirmationProvider/confirmWindow';
import type {
  TConfirmationContext,
  TConfirmationHookProps,
  TConfirmationWindowProps,
  TConfirmWindow,
} from '@providers/ConfirmationProvider/types';
import type { ComponentType } from 'react';
import { bridgeNotMounted } from './bridgeNotMounted';

let context: TConfirmationContext | null = null;

/** Called by `ConfirmationProvider` on mount; the returned function unregisters it. */
export function registerConfirmationBridge(value: TConfirmationContext): () => void {
  context = value;
  return () => {
    if (context === value) context = null;
  };
}

/**
 * `useConfirm` for code outside React (services). Same semantics: `confirm()` resolves `true` or
 * `false` after the exit animation, and rejects only on real failures. Create it at module level;
 * the window is registered with the provider on first use.
 */
export function createConfirm<T extends TConfirmationWindowProps>(
  Content: ComponentType<T>,
  confirmProps?: TConfirmationHookProps
): TConfirmWindow<T> {
  return createConfirmWindow(
    () => context ?? bridgeNotMounted('confirmation'),
    Content,
    confirmProps
  );
}

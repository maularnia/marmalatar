import { TButtonProps } from '@ui-toolkit/Button/types';
import { ComponentType, ReactNode } from 'react';

export type WindowID = ReturnType<typeof crypto.randomUUID>;

export type ConfirmationHookProps = {
  confirmButton?: TButtonProps;
  dismissButton?: TButtonProps;
  /** Disables the appear/disappear spring animation for this window when `false`. Defaults to
   * animated (`true`) when omitted. Applies to both confirmation windows (`useConfirm`) and info
   * windows (`useInfoWindow`). */
  animate?: boolean;
};

export type TInternalConfirmationWindowProps = {
  Content: ({ onValidChange }: { onValidChange?: (isValid: boolean) => void }) => ReactNode;
  onValidChange?: (isValid: boolean) => void;
  onConfirm?: () => void;
  onDismiss?: () => void;
  isValid?: boolean;
  confirmButton?: TButtonProps;
  dismissButton?: TButtonProps;
  animate?: boolean;
};

export type TConfirmationContext = {
  registerWindow: () => WindowID;
  destroyWindow: (id: WindowID) => void;
  open: (id: WindowID, props: TInternalConfirmationWindowProps) => void;
  /** `onExitAnimationComplete`, if given, fires once this window has actually finished its exit
   * animation (not merely been removed from `openWindows`) -- see ConfirmationProvider.tsx's
   * `pendingExitCallbacksRef`/`onExitComplete`. */
  close: (id: WindowID, onExitAnimationComplete?: () => void) => void;
};

export type TConfirmationWindowProps = {
  onValidChange?: (isValid: boolean) => void;
};

export type TUseConfirm = <T extends TConfirmationWindowProps>(
  Content: ComponentType<T>,
  props?: ConfirmationHookProps
) => {
  /** Resolves `true` if confirmed, `false` if dismissed. Only rejects for genuine failures. */
  confirm: (
    props: T,
    validate?: () => boolean,
    overrides?: ConfirmationHookProps
  ) => Promise<boolean>;
  close: () => void;
  destroy: () => void;
};

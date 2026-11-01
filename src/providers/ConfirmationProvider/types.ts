import { TButtonProps } from '@ui-toolkit/Button/types';
import { ComponentType, ReactNode } from 'react';

export type TWindowID = ReturnType<typeof crypto.randomUUID>;

export type TConfirmationHookProps = {
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
  registerWindow: () => TWindowID;
  destroyWindow: (id: TWindowID) => void;
  open: (id: TWindowID, props: TInternalConfirmationWindowProps) => void;
  /** `onExitAnimationComplete`, if given, fires once this window has actually finished its exit
   * animation (not merely been removed from `openWindows`) -- see ConfirmationProvider.tsx's
   * `pendingExitCallbacksRef`/`onExitComplete`. */
  close: (id: TWindowID, onExitAnimationComplete?: () => void) => void;
};

export type TConfirmationWindowProps = {
  onValidChange?: (isValid: boolean) => void;
};

export type TUseConfirm = <T extends TConfirmationWindowProps>(
  Content: ComponentType<T>,
  props?: TConfirmationHookProps
) => {
  /** Resolves `true` if confirmed, `false` if dismissed. Only rejects for genuine failures. */
  confirm: (
    props: T,
    validate?: () => boolean,
    overrides?: TConfirmationHookProps
  ) => Promise<boolean>;
  close: () => void;
  destroy: () => void;
};

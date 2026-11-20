import type { TButtonProps } from '@ui-toolkit/Button/types';
import type { ReactNode } from 'react';

export type TModalId = ReturnType<typeof crypto.randomUUID>;

/** What every modal's content gets: it reports whether the confirm action is currently allowed. */
export type TModalContentProps = {
  onValidChange?: (isValid: boolean) => void;
};

// A button's label is required: callers translate it when they open the dialog, so it's in the
// locale of that moment (this service never translates anything itself)
type TModalButton = TButtonProps & { children: ReactNode };

export type TModalConfirmOptions = {
  confirmButton: TModalButton;
  dismissButton: TModalButton;
  /** Checked when the user confirms; a falsy result keeps the window open. */
  validate?: () => boolean;
  /** Disables the appear/disappear spring when `false`. Animated when omitted. */
  animate?: boolean;
};

export type TModalInfoOptions = {
  /** Disables the appear/disappear spring when `false`. Animated when omitted. */
  animate?: boolean;
  /** Time, in ms, the window waits before appearing. If the promise settles sooner, it never
   * appears. Defaults to 300; 0 opens it immediately. */
  delay?: number;
  /** Shortest time, in ms, the window stays on screen once it has appeared, so a promise that
   * settles quickly doesn't flash it. Defaults to 1000. */
  minLifeTime?: number;
};

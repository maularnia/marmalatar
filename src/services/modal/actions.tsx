import { Service } from '@src/services/Service';
import type { ComponentType } from 'react';
import { modalEntries, pendingExitCallbacks } from './registry';
import { modalClosed, modalOpened, modalValidityChanged } from './slice';
import type {
  TModalConfirmOptions,
  TModalContentProps,
  TModalId,
  TModalInfoOptions,
} from './types';

// The modal service's operations. Services open dialogs only through these (modal.confirm,
// modal.showInfo); the Modals host renders whatever is open and reports back through the
// host-only functions below.

const DEFAULT_INFO_DELAY = 300;
const DEFAULT_INFO_MIN_LIFE_TIME = 1000;

function closeWindow(id: TModalId, onExited?: () => void): void {
  if (onExited) pendingExitCallbacks.set(id, onExited);
  Service.dispatch(modalClosed(id));
}

// ── Opening ──────────────────────────────────────────────────────────────────

/**
 * Opens a confirmation window with `Content` and resolves `true` when confirmed, `false` when
 * dismissed -- dismissing is an expected outcome, not an error. Resolves once the window has
 * finished its exit animation (immediately with `animate: false`).
 */
export function confirmModal<T extends TModalContentProps>(
  Content: ComponentType<T>,
  props: T,
  { confirmButton, dismissButton, validate = () => true, animate = true }: TModalConfirmOptions
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const id = crypto.randomUUID();
    let settled = false;
    const settle = (confirmed: boolean) => {
      if (settled) return;
      settled = true;
      const finish = () => {
        modalEntries.delete(id);
        resolve(confirmed);
      };
      // Without the animation there's no exit to wait for
      closeWindow(id, animate ? finish : undefined);
      if (!animate) finish();
    };
    modalEntries.set(id, {
      render: (onValidChange) => (
        <Content
          {...props}
          onValidChange={(isValid: boolean) => {
            onValidChange(isValid);
            props.onValidChange?.(isValid);
          }}
        />
      ),
      confirmButton,
      dismissButton,
      onConfirm: () => {
        if (validate()) settle(true);
      },
      onDismiss: () => settle(false),
    });
    Service.dispatch(modalOpened({ id, kind: 'confirm', isValid: true, animate }));
  });
}

/**
 * Shows a window without actions while `promise` runs, and resolves or rejects with it once the
 * window is closing. It appears only after `delay` and then stays at least `minLifeTime`.
 */
export function showInfoModal<T extends object, R>(
  Content: ComponentType<T>,
  props: T,
  promise: Promise<R>,
  {
    animate = true,
    delay = DEFAULT_INFO_DELAY,
    minLifeTime = DEFAULT_INFO_MIN_LIFE_TIME,
  }: TModalInfoOptions = {}
): Promise<R> {
  const id = crypto.randomUUID();
  // Stays undefined until the window has actually appeared
  let minLifeTimeElapsed: Promise<void> | undefined;
  const open = () => {
    modalEntries.set(id, { render: () => <Content {...props} /> });
    Service.dispatch(modalOpened({ id, kind: 'info', isValid: true, animate }));
    minLifeTimeElapsed = new Promise((resolve) => setTimeout(resolve, minLifeTime));
  };
  // Without a delay the window has to open synchronously: a timer would leave a gap in which the
  // UI isn't blocked yet.
  const delayTimeout = delay > 0 ? setTimeout(open, delay) : undefined;
  if (delay <= 0) open();
  // `finally` waits for the callback, so callers continue only once the window is closing -- with
  // the original promise's result or rejection left untouched.
  return promise.finally(async () => {
    clearTimeout(delayTimeout);
    if (!minLifeTimeElapsed) return;
    await minLifeTimeElapsed;
    const forget = () => modalEntries.delete(id);
    closeWindow(id, animate ? forget : undefined);
    if (!animate) forget();
  });
}

// ── Host ─────────────────────────────────────────────────────────────────────

// For the Modals host only: the content reported whether confirming is allowed
export function setModalValidity(id: TModalId, isValid: boolean): void {
  Service.dispatch(modalValidityChanged({ id, isValid }));
}

// For the Modals host only: every closed window has finished its exit animation
export function completeModalExits(): void {
  const callbacks = [...pendingExitCallbacks.values()];
  pendingExitCallbacks.clear();
  callbacks.forEach((callback) => callback());
}

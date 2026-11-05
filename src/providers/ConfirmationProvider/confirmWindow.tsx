import i18n from '@src/i18n';
import { ComponentType } from 'react';
import {
  TConfirmationContext,
  TInfoWindow,
  TConfirmationHookProps,
  TConfirmationWindowProps,
  TConfirmWindow,
  TWindowID,
} from './types';

const ERROR_CONFIRM_DESTROYED = i18n.getFixedT(
  null,
  'errors'
)('confirmationProvider.confirmDestroyed');

/**
 * Window logic shared by `useConfirm` (hook) and `createConfirm` (bridge, for services). The window
 * is registered with the provider on first use; `getContext` is read on every call, so the bridge
 * can hand over whichever provider is mounted at that moment.
 */
export function createConfirmWindow<T extends TConfirmationWindowProps>(
  getContext: () => TConfirmationContext,
  Content: ComponentType<T>,
  confirmProps?: TConfirmationHookProps
): TConfirmWindow<T> {
  let windowId: TWindowID | null | undefined;
  let destroyed = false;
  const getId = (): TWindowID | null => {
    if (destroyed) return null;
    windowId ??= getContext().registerWindow();
    return windowId;
  };

  return {
    // Resolves `true` on confirm, `false` on dismiss -- dismissal is an expected, non-error
    // outcome, so it's never surfaced as a rejection. The promise only ever rejects for genuine
    // failures (e.g. `ERROR_CONFIRM_DESTROYED`), letting callers propagate those without having to
    // first sniff the rejection reason to tell a cancel apart from a real error.
    confirm: (userProps, validate = () => true, overrides) =>
      new Promise<boolean>((resolve, reject) => {
        const id = getId();
        if (!id) {
          reject(ERROR_CONFIRM_DESTROYED);
          return;
        }
        const context = getContext();
        // `animate: false` windows have no exit transition at all (see Confirmation's `.attrs`
        // gating) -- nothing for AnimatePresence's onExitComplete to ever fire for, so finalize
        // immediately for those instead of registering a pending callback.
        const resolvedAnimate = overrides?.animate ?? confirmProps?.animate;
        let outcome: 'confirm' | 'dismiss' | null = null;
        const finalize = () => {
          if (outcome === 'confirm') resolve(true);
          else if (outcome === 'dismiss') resolve(false);
        };
        const settle = (result: 'confirm' | 'dismiss') => {
          if (destroyed) {
            reject(ERROR_CONFIRM_DESTROYED);
            return;
          }
          outcome = result;
          context.close(id, resolvedAnimate === false ? undefined : finalize);
          if (resolvedAnimate === false) finalize();
        };
        context.open(id, {
          Content: ({ onValidChange }) => (
            <Content
              {...userProps}
              onValidChange={(isValid) => {
                onValidChange?.(isValid);
                userProps.onValidChange?.(isValid);
              }}
            />
          ),
          onConfirm: () => {
            if (!destroyed && !validate()) return;
            settle('confirm');
          },
          onDismiss: () => settle('dismiss'),
          ...(confirmProps ? confirmProps : {}),
          ...(overrides ? overrides : {}),
        });
      }),
    close: () => {
      const id = getId();
      if (!id) throw new Error(ERROR_CONFIRM_DESTROYED);
      getContext().close(id);
    },
    destroy: () => {
      if (destroyed) throw new Error(ERROR_CONFIRM_DESTROYED);
      if (windowId) getContext().destroyWindow(windowId);
      destroyed = true;
    },
  };
}

const DEFAULT_INFO_WINDOW_DELAY = 300;
const DEFAULT_INFO_WINDOW_MIN_LIFE_TIME = 1000;

/**
 * Window logic shared by `useInfoWindow` (hook) and the bridge's `createInfoWindow` (for services):
 * a window without actions, shown while a promise runs. Registered with the provider on first use.
 */
export function createInfoWindow<T extends Record<string, unknown>>(
  getContext: () => TConfirmationContext,
  Content: ComponentType<T>
): TInfoWindow<T> {
  let windowId: TWindowID | undefined;
  const getId = (): TWindowID => (windowId ??= getContext().registerWindow());

  return {
    show: (props, promise, options) => {
      const id = getId();
      const context = getContext();
      const {
        animate,
        delay = DEFAULT_INFO_WINDOW_DELAY,
        minLifeTime = DEFAULT_INFO_WINDOW_MIN_LIFE_TIME,
      } = options ?? {};
      // Stays undefined until the window has actually appeared
      let minLifeTimeElapsed: Promise<void> | undefined;
      const openWindow = () => {
        context.open(id, { Content: () => <Content {...props} />, animate });
        minLifeTimeElapsed = new Promise((resolve) => setTimeout(resolve, minLifeTime));
      };
      // Without a delay the window has to open synchronously: a timer would leave a gap in which
      // the UI isn't blocked yet.
      const delayTimeout = delay > 0 ? setTimeout(openWindow, delay) : undefined;
      if (delay <= 0) openWindow();
      // `finally` waits for the callback, so callers also continue only once the window is closing
      // -- with the original promise's result or rejection left untouched.
      return promise.finally(async () => {
        clearTimeout(delayTimeout);
        if (!minLifeTimeElapsed) return;
        await minLifeTimeElapsed;
        context.close(id);
      });
    },
    close: () => getContext().close(getId()),
  };
}

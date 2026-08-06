import { useGlobalKeystrokePause } from '@providers/GlobalKeystroke/GlobalKeystrokeDispatcher';
import { usePopperPortal } from '@providers/PopperPortalProvider';
import i18n from '@src/i18n';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { appearDownSpring, appearUpSpring } from '@src/toolkit/motion/transitions';
import Button from '@ui-toolkit/Button/Button';
import { TButtonVariant } from '@ui-toolkit/Button/types';
import FocusTrap from '@ui-toolkit/FocusTrap';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import { providerNoop } from '@utils/noop';
import { AnimatePresence, motion } from 'motion/react';
import {
  ComponentType,
  createContext,
  PropsWithChildren,
  ReactNode,
  RefObject,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { ConfirmationKeyhubProvider } from './ConfirmationKeyhubProvider';
import {
  ConfirmationHookProps,
  TConfirmationContext,
  TInternalConfirmationWindowProps,
  TUseConfirm,
  WindowID,
} from './types';

const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 990;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${CSSVar('windowBackdropBg')};
  backdrop-filter: ${CSSVar('windowBackdropFilter')};
`;
// `$animate={false}` (threaded from a window's `animate` option) skips the appear/disappear
// spring entirely for that window -- omitting initial/animate/exit means the element just renders
// in its resting state with nothing to transition, rather than us picking some "instant" duration.
type TAnimatedAttrs = { $animate?: boolean };

const Dialog = styled(motion.div).attrs<TAnimatedAttrs>(({ $animate }) =>
  $animate === false ? {} : appearDownSpring
)`
  position: relative;
  width: min-content;
  height: min-content;
  flex-direction: column;
  perspective: 300px;
`;

const DialogMessage = styled(motion.div)`
  color: ${CSSVar('windowColor')};
  font-size: ${CSSVar('sizeTextRegular')};
  font-family: ${CSSVar('fontTextSansSerif')};
  line-height: calc(${CSSVar('sizeTextRegular')} * 1.4);
`;

const Actions = styled(motion.div).attrs<TAnimatedAttrs>(({ $animate }) =>
  $animate === false ? {} : appearDownSpring
)`
  display: flex;
  gap: ${CSSVar('windowSpacingInnerX')};
  padding-top: calc(${CSSVar('windowSpacingInnerY')} * 2);
  justify-content: center;
  width: 100%;
`;

const DialogStyledButtonContainer = styled(motion.div).attrs<TAnimatedAttrs>(({ $animate }) =>
  $animate === false ? {} : appearUpSpring
)`
  position: relative;
`;

const DialogHotkeyTooltips = styled(motion.div).attrs<TAnimatedAttrs>(({ $animate }) =>
  $animate === false ? {} : appearUpSpring
)`
  position: absolute;
  top: calc(100% + ${CSSVar('windowSpacingInnerY')});
  width: 100%;
  opacity: ${CSSVar('opacity-40')};
  display: flex;
  justify-content: center;
`;

const confiramtionNoop = providerNoop('Confirmation');

const Confirmation: (props: TInternalConfirmationWindowProps) => ReactNode = ({
  onConfirm,
  onDismiss,
  onValidChange,
  confirmButton,
  dismissButton,
  isValid,
  animate,
  Content,
}) => {
  const hasActions = onConfirm != null || onDismiss != null;
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  // The dismiss button intentionally uses the dialog's own down-spring rather than the other
  // buttons' up-spring -- still gated by `animate` the same way as everything else here.
  const dismissButtonSpring = animate === false ? {} : appearDownSpring;
  return (
    <Backdrop onClick={onDismiss}>
      <Dialog
        ref={dialogRef}
        role={'dialog'}
        onClick={(e) => e.stopPropagation()}
        $animate={animate}
      >
        <FocusTrap active initialFocusRef={cancelRef}>
          <ConfirmationKeyhubProvider
            dialogRef={dialogRef}
            onConfirm={onConfirm}
            onDismiss={onDismiss}
            isValid={isValid}
          >
            <DialogMessage>
              <Content onValidChange={onValidChange} />
            </DialogMessage>
            {hasActions && (
              <Actions $animate={animate} initial="hidden" animate="animate" exit="exit">
                <DialogStyledButtonContainer
                  key={'dismiss'}
                  $animate={animate}
                  {...dismissButtonSpring}
                >
                  <Button
                    ref={cancelRef}
                    onClick={onDismiss}
                    variant={TButtonVariant.TRANSPARENT}
                    {...{ children: 'Cancel', ...dismissButton }}
                  />
                  <DialogHotkeyTooltips $animate={animate}>
                    <Tag
                      size={TTagSize.NANO}
                      variant={TTagVariant.SECONDARY}
                      color={ThemeColors.TEXT}
                    >
                      N / Esc
                    </Tag>
                  </DialogHotkeyTooltips>
                </DialogStyledButtonContainer>

                <DialogStyledButtonContainer key={'confirm'} $animate={animate}>
                  <Button
                    ref={confirmRef}
                    onClick={onConfirm}
                    disabled={isValid === false}
                    variant={TButtonVariant.TRANSPARENT}
                    {...{ children: 'Confirm', ...confirmButton }}
                  />
                  <DialogHotkeyTooltips $animate={animate}>
                    <Tag
                      size={TTagSize.NANO}
                      variant={TTagVariant.SECONDARY}
                      color={ThemeColors.TEXT}
                    >
                      Y
                    </Tag>
                  </DialogHotkeyTooltips>
                </DialogStyledButtonContainer>
              </Actions>
            )}
          </ConfirmationKeyhubProvider>
        </FocusTrap>
      </Dialog>
    </Backdrop>
  );
};

const ConfirmationContext = createContext<TConfirmationContext>({
  registerWindow: confiramtionNoop,
  open: confiramtionNoop,
  close: confiramtionNoop,
  destroyWindow: confiramtionNoop,
});

export const ConfirmationProvider = ({ children }: PropsWithChildren) => {
  const windows = useRef(new Map<WindowID, TInternalConfirmationWindowProps>());
  const [openWindows, setOpenWindows] = useState<WindowID[]>([]);
  const overlays = usePopperPortal();
  // The entire ctrl+1..0/esc isolation mechanism: while any confirmation is open, the global
  // dispatcher is paused, so those shortcuts never fire and can't steal focus from the dialog.
  useGlobalKeystrokePause(openWindows.length > 0);
  // Callbacks to run once a given window has actually finished its exit animation (not merely
  // been removed from `openWindows`) -- see `handleExitComplete` below.
  const pendingExitCallbacksRef = useRef(new Map<WindowID, () => void>());

  const close = useCallback((id: WindowID, onExitAnimationComplete?: () => void) => {
    if (onExitAnimationComplete) {
      pendingExitCallbacksRef.current.set(id, onExitAnimationComplete);
    }
    setOpenWindows((prev) => prev.filter((windowId) => windowId !== id));
  }, []);

  const handleExitComplete = useCallback(() => {
    pendingExitCallbacksRef.current.forEach((callback) => callback());
    pendingExitCallbacksRef.current.clear();
  }, []);

  const open = useCallback((id: WindowID, props: TInternalConfirmationWindowProps) => {
    windows.current.set(id, props);
    setOpenWindows((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const destroyWindow = useCallback((id: WindowID) => {
    windows.current.delete(id);
    setOpenWindows((prev) => prev.filter((windowId) => windowId !== id));
  }, []);

  const registerWindow = useCallback(() => {
    const id = crypto.randomUUID();
    windows.current.set(id, { Content: () => null });
    return id;
  }, []);

  const value = useMemo(
    () => ({
      registerWindow,
      destroyWindow,
      open,
      close,
    }),
    [registerWindow, destroyWindow, open, close]
  );
  const rerenderWindows = () => setOpenWindows((prev) => [...prev]);
  return (
    <ConfirmationContext.Provider value={value}>
      {overlays
        ? createPortal(
            <AnimatePresence mode="wait" onExitComplete={handleExitComplete}>
              {openWindows.map((id) => {
                const props = windows.current.get(id);
                const onValidChnage = (isValid: boolean) => {
                  if (!props) return;
                  props.isValid = isValid;
                  rerenderWindows();
                };
                return props ? (
                  <Confirmation key={id} {...props} onValidChange={onValidChnage} />
                ) : null;
              })}
            </AnimatePresence>,
            overlays
          )
        : null}
      {children}
    </ConfirmationContext.Provider>
  );
};

const ERROR_CONFIRM_DESTROYED = i18n.getFixedT(
  null,
  'errors'
)('confirmationProvider.confirmDestroyed');

export function useInfoWindow<T extends Record<string, unknown>>(Content: ComponentType<T>) {
  const confirmationContext = useContext(ConfirmationContext);
  const currentWindowRef: RefObject<WindowID | null> = useRef(confirmationContext.registerWindow());
  return {
    show: <R,>(
      props: T,
      promise: Promise<R>,
      options?: Pick<ConfirmationHookProps, 'animate'>
    ): Promise<R> => {
      if (!currentWindowRef.current) throw new Error(ERROR_CONFIRM_DESTROYED);
      const id = currentWindowRef.current;
      confirmationContext.open(id, {
        Content: () => <Content {...props} />,
        animate: options?.animate,
      });
      return promise.finally(() => {
        confirmationContext.close(id);
      });
    },
    close: () => {
      if (!currentWindowRef.current) throw new Error(ERROR_CONFIRM_DESTROYED);
      confirmationContext.close(currentWindowRef.current);
    },
  };
}

export const useConfirm: TUseConfirm = (Content, confirmProps) => {
  const confirmationContext = useContext(ConfirmationContext);
  const currentWindowRef: RefObject<WindowID | null> = useRef(confirmationContext.registerWindow());
  return {
    // Resolves `true` on confirm, `false` on dismiss -- dismissal is an expected, non-error
    // outcome, so it's never surfaced as a rejection. The promise only ever rejects for genuine
    // failures (e.g. `ERROR_CONFIRM_DESTROYED`), letting callers propagate those without having to
    // first sniff the rejection reason to tell a cancel apart from a real error.
    confirm: (userProps, validate = () => true, overrides) =>
      new Promise<boolean>((resolve, reject) => {
        if (!currentWindowRef.current) {
          reject(ERROR_CONFIRM_DESTROYED);
          return;
        }
        // `animate: false` windows have no exit transition at all (see Confirmation's `.attrs`
        // gating) -- nothing for AnimatePresence's onExitComplete to ever fire for, so finalize
        // immediately for those instead of registering a pending callback.
        const resolvedAnimate = overrides?.animate ?? confirmProps?.animate;
        let outcome: 'confirm' | 'dismiss' | null = null;
        const finalize = () => {
          if (outcome === 'confirm') resolve(true);
          else if (outcome === 'dismiss') resolve(false);
        };
        confirmationContext.open(currentWindowRef.current, {
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
            if (!currentWindowRef.current) {
              reject(ERROR_CONFIRM_DESTROYED);
              return;
            }
            if (!validate()) return;
            outcome = 'confirm';
            confirmationContext.close(
              currentWindowRef.current,
              resolvedAnimate === false ? undefined : finalize
            );
            if (resolvedAnimate === false) finalize();
          },
          onDismiss: () => {
            if (!currentWindowRef.current) {
              reject(ERROR_CONFIRM_DESTROYED);
              return;
            }
            outcome = 'dismiss';
            confirmationContext.close(
              currentWindowRef.current,
              resolvedAnimate === false ? undefined : finalize
            );
            if (resolvedAnimate === false) finalize();
          },
          ...(confirmProps ? confirmProps : {}),
          ...(overrides ? overrides : {}),
        });
      }),
    close: () => {
      if (!currentWindowRef.current) {
        throw new Error(ERROR_CONFIRM_DESTROYED);
      }
      confirmationContext.close(currentWindowRef.current);
    },
    destroy: () => {
      if (!currentWindowRef.current) {
        throw new Error(ERROR_CONFIRM_DESTROYED);
      }
      confirmationContext.destroyWindow(currentWindowRef.current);
      currentWindowRef.current = null;
    },
  };
};

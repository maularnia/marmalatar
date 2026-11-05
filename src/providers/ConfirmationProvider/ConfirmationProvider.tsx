import { useGlobalKeystrokePause } from '@providers/GlobalKeystroke/GlobalKeystrokeDispatcher';
import { usePopperPortal } from '@providers/PopperPortalProvider';
import { registerConfirmationBridge } from '@providers/bridges/confirmation';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { appearDownSpring, appearUpSpring } from '@src/toolkit/motion/transitions';
import Button from '@ui-toolkit/Button/Button';
import { TButtonVariant } from '@ui-toolkit/Button/types';
import FocusTrap from '@ui-toolkit/FocusTrap';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import { providerNoop } from '@utils/noop';
import { useMemoizedObject } from '@src/utils/useMemoizedObject';
import { AnimatePresence, motion } from 'motion/react';
import {
  ComponentType,
  createContext,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { ConfirmationKeyhubProvider } from './ConfirmationKeyhubProvider';
import { createConfirmWindow, createInfoWindow } from './confirmWindow';
import {
  TConfirmationContext,
  TInternalConfirmationWindowProps,
  TUseConfirm,
  TWindowID,
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

const noop = providerNoop('ConfirmationContext');

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
  registerWindow: noop,
  open: noop,
  close: noop,
  destroyWindow: noop,
});

export function ConfirmationProvider({ children }: PropsWithChildren) {
  const windows = useRef(new Map<TWindowID, TInternalConfirmationWindowProps>());
  const [openWindows, setOpenWindows] = useState<TWindowID[]>([]);
  const overlays = usePopperPortal();
  // The entire ctrl+1..0/esc isolation mechanism: while any confirmation is open, the global
  // dispatcher is paused, so those shortcuts never fire and can't steal focus from the dialog.
  useGlobalKeystrokePause(openWindows.length > 0);
  // Callbacks to run once a given window has actually finished its exit animation (not merely
  // been removed from `openWindows`) -- see `handleExitComplete` below.
  const pendingExitCallbacksRef = useRef(new Map<TWindowID, () => void>());

  const close = useCallback((id: TWindowID, onExitAnimationComplete?: () => void) => {
    if (onExitAnimationComplete) {
      pendingExitCallbacksRef.current.set(id, onExitAnimationComplete);
    }
    setOpenWindows((prev) => prev.filter((windowId) => windowId !== id));
  }, []);

  const handleExitComplete = useCallback(() => {
    pendingExitCallbacksRef.current.forEach((callback) => callback());
    pendingExitCallbacksRef.current.clear();
  }, []);

  const open = useCallback((id: TWindowID, props: TInternalConfirmationWindowProps) => {
    windows.current.set(id, props);
    setOpenWindows((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const destroyWindow = useCallback((id: TWindowID) => {
    windows.current.delete(id);
    setOpenWindows((prev) => prev.filter((windowId) => windowId !== id));
  }, []);

  const registerWindow = useCallback(() => {
    const id = crypto.randomUUID();
    windows.current.set(id, { Content: () => null });
    return id;
  }, []);

  const value = useMemoizedObject<TConfirmationContext>({
    registerWindow,
    destroyWindow,
    open,
    close,
  });
  useEffect(() => registerConfirmationBridge(value), [value]);

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
}

export function useInfoWindow<T extends Record<string, unknown>>(Content: ComponentType<T>) {
  const confirmationContext = useContext(ConfirmationContext);
  // Created once: the context value is stable, and the window registers itself on first use.
  const [infoWindow] = useState(() => createInfoWindow(() => confirmationContext, Content));
  return infoWindow;
}

export const useConfirm: TUseConfirm = (Content, confirmProps) => {
  const confirmationContext = useContext(ConfirmationContext);
  // Created once: the context value is stable, and the window registers itself on first use.
  const [confirmWindow] = useState(() =>
    createConfirmWindow(() => confirmationContext, Content, confirmProps)
  );
  return confirmWindow;
};

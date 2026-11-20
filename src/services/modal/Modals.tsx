import { usePopperPortal } from '@providers/PopperPortalProvider';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { appearDownSpring, appearUpSpring } from '@src/toolkit/motion/transitions';
import { useAppSelector } from '@store/hooks';
import Button from '@ui-toolkit/Button/Button';
import { TButtonVariant } from '@ui-toolkit/Button/types';
import FocusTrap from '@ui-toolkit/FocusTrap';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import { AnimatePresence, motion } from 'motion/react';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { completeModalExits, setModalValidity } from './actions';
import { ModalKeyhub } from './ModalKeyhub';
import { modalEntries, type TModalEntry } from './registry';
import { selectModalWindows } from './slice';

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

type TModalWindowProps = TModalEntry & {
  isValid: boolean;
  animate: boolean;
  onValidChange: (isValid: boolean) => void;
};

function ModalWindow({
  render,
  onConfirm,
  onDismiss,
  onValidChange,
  confirmButton,
  dismissButton,
  isValid,
  animate,
}: TModalWindowProps) {
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
          <ModalKeyhub
            dialogRef={dialogRef}
            onConfirm={onConfirm}
            onDismiss={onDismiss}
            isValid={isValid}
          >
            <DialogMessage>{render(onValidChange)}</DialogMessage>
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
                    {...dismissButton}
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
                    {...confirmButton}
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
          </ModalKeyhub>
        </FocusTrap>
      </Dialog>
    </Backdrop>
  );
}

// The host of every modal window: renders the windows the modal slice lists, portaled above the
// app. Mounted once in main.tsx. Windows are opened only through the facade (modal.confirm,
// modal.showInfo); their content and buttons come from the registry.
export function Modals() {
  const windows = useAppSelector(selectModalWindows);
  const overlays = usePopperPortal();
  if (!overlays) return null;
  return createPortal(
    <AnimatePresence mode="wait" onExitComplete={completeModalExits}>
      {windows.map(({ id, isValid, animate }) => {
        const entry = modalEntries.get(id);
        return entry ? (
          <ModalWindow
            key={id}
            {...entry}
            isValid={isValid}
            animate={animate}
            onValidChange={(valid) => setModalValidity(id, valid)}
          />
        ) : null;
      })}
    </AnimatePresence>,
    overlays
  );
}

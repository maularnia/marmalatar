import { useEditorActions } from '@providers/EditorActionsProvider';
import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { appearRightEase } from '@src/toolkit/motion/transitions';
import Button from '@ui-toolkit/Button/Button';
import { TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import FocusTrap from '@ui-toolkit/FocusTrap';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { motion } from 'motion/react';
import { PropsWithChildren } from 'react';
import styled from 'styled-components';

const OverlayRoot = styled.div`
  position: absolute;
  display: flex;
  inset: 0;
  z-index: 20;
`;

const OverlayBackdrop = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: ${CSSColor(ThemeColors.BG, TShade.DEFAULT, 70)};
  backdrop-filter: blur(${CSSVar('blurHeavy')});
`;

const OverlayInner = styled(motion.div).attrs(appearRightEase)`
  position: relative;
  width: 680px;
  background: ${CSSColor(ThemeColors.BG, TShade.DEFAULT, 90)};

  overflow-y: auto;
  &::-webkit-scrollbar {
    width: ${CSSVar('appScrollbarWidth')};
  }

  &::-webkit-scrollbar-track {
    background: ${CSSVar('appScrollbarTrackColor')};
    border-radius: ${CSSVar('appScrollbarBorderRadius')};
  }

  &::-webkit-scrollbar-thumb {
    width: calc(${CSSVar('appScrollbarWidth')} * 2);
    background: ${CSSVar('appScrollbarThumbColor')};
    border-radius: ${CSSVar('appScrollbarBorderRadius')};
  }
`;

const OverlayButton = styled(Button)`
  position: absolute;
  right: 0;
  top: 0;
`;

type OverlayProps = PropsWithChildren<{
  onClose: () => void;
}>;

export default function Overlay({ onClose, children }: OverlayProps) {
  const { handleFocusEditor } = useEditorActions();
  return (
    <OverlayRoot>
      <OverlayBackdrop onClick={onClose} />
      <OverlayInner>
        <FocusTrap active onUnmount={handleFocusEditor}>
          <>
            {children}
            <OverlayButton
              size={TButtonSize.REGULAR}
              variant={TButtonVariant.TRANSPARENT}
              icon={TIcon.CROSS}
              onClick={onClose}
            />
          </>
        </FocusTrap>
      </OverlayInner>
    </OverlayRoot>
  );
}

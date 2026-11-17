import { editor } from '@src/services/project';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { TShade } from '@src/theme/definitions';
import Button from '@ui-toolkit/Button/Button';
import { TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Tooltip, { TooltipComplex, TooltipKeystrokeHint } from '@ui-toolkit/Tooltip';
import { animateEaseOut } from '@src/toolkit/motion/transitions';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { BackdropBase, backdropMotion, type TLineGeometry } from './BackdropBase';

const Backdrop = styled(BackdropBase)`
  backdrop-filter: ${CSSVar('mainTableMergeCandidateBackdropFilter')};
  /* The fill lives on its own layer with the theme's opacity, so the element's own opacity is free
     for the appearance animation */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: ${CSSVar('mainTableMergeCandidateBackdropOpacity')};
    background: radial-gradient(
      circle at center bottom,
      ${CSSVar('mainTableMergeCandidateBackdropBg')} 0%,
      transparent 150%
    );
  }

  /* Square where it meets the focused line: the one above loses its bottom corners, the one below
     its top corners */
  &.up {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
  &.down {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }
`;

// The merge button sits in the middle of its candidate's backdrop. Its z-index lifts it above the
// rows (so it can be clicked) while the backdrop itself lies under them.
const ButtonSlot = styled.div`
  position: absolute;
  z-index: 4;
  left: 50%;
  transform: translate3d(-50%, -50%, 0);
  background: ${CSSColor(ThemeColors.BG, TShade.DEFAULT, 5)};
  border-radius: ${CSSVar('size4')};
  backdrop-filter: blur(${CSSVar('blurHeavy')});
`;

// How far a merge button or backdrop travels as it appears, in px
const BUTTON_APPEAR_SHIFT = 8;

// A candidate's backdrop comes in towards the focused line, like its button: the upper one rises
// into place, the lower one drops into place. After that it follows its line like any backdrop.
function appearingBackdropMotion(direction: 'up' | 'down', geometry: TLineGeometry) {
  const placement = backdropMotion(geometry);
  return {
    ...placement,
    initial: {
      top: geometry.top,
      opacity: 0,
      y: direction === 'up' ? BUTTON_APPEAR_SHIFT : -BUTTON_APPEAR_SHIFT,
    },
    animate: { ...placement.animate, opacity: 1, y: 0 },
  };
}

export type TMergeCandidate = {
  /** Where the candidate is relative to the focused line: merging it is merging up or down */
  direction: 'up' | 'down';
  geometry: TLineGeometry;
};

type TMergeCandidateBackdropsProps = {
  focusedLineIndex: number | null;
  candidates: readonly TMergeCandidate[];
};

/** Under the focused line's merge candidates (its neighbours, while the merge modifier is held),
 * with their backdrops. Nothing without candidates. */
export function MergeCandidateBackdrops({ candidates }: TMergeCandidateBackdropsProps) {
  if (candidates.length === 0) return null;
  return (
    <>
      {candidates.map(({ direction, geometry }) => (
        <Backdrop
          key={direction}
          className={direction}
          {...appearingBackdropMotion(direction, geometry)}
        />
      ))}
    </>
  );
}

/** The merge buttons of those candidates, a plus in the middle of each candidate, above the rows.
 * Nothing without candidates. */
export function MergeCandidateButtons({
  focusedLineIndex,
  candidates,
}: TMergeCandidateBackdropsProps) {
  const { t } = useTranslation('editor');
  if (candidates.length === 0 || focusedLineIndex == null) return null;
  return (
    <>
      {candidates.map(({ direction, geometry }) => {
        const isUp = direction === 'up';
        // In the middle of its candidate's backdrop
        const top = geometry.top + geometry.height / 2;
        return (
          <ButtonSlot key={direction} style={{ top }}>
            {/* Comes in towards its candidate: the upper button rises into place, the lower one
                drops into place */}
            <motion.div
              initial={{ opacity: 0, y: isUp ? BUTTON_APPEAR_SHIFT : -BUTTON_APPEAR_SHIFT }}
              animate={{ opacity: 1, y: 0 }}
              transition={animateEaseOut.fast}
            >
              <Tooltip
                side={isUp ? 'top' : 'bottom'}
                label={
                  <TooltipComplex title={t(isUp ? 'tableLine.mergeUp' : 'tableLine.mergeDown')}>
                    <TooltipKeystrokeHint keys={['Alt', 'Shift', isUp ? '⭡' : '🠧']} />
                  </TooltipComplex>
                }
              >
                <Button
                  variant={TButtonVariant.TRANSPARENT}
                  size={TButtonSize.SMALL}
                  icon={TIcon.PLUS}
                  onClick={() => editor.mergeLines(focusedLineIndex, direction)}
                />
              </Tooltip>
            </motion.div>
          </ButtonSlot>
        );
      })}
    </>
  );
}

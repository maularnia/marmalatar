import { CSSVar } from '@src/theme/utils';
import classNames from 'classnames';
import styled from 'styled-components';
import { BackdropBase, backdropMotion, type TLineGeometry } from './BackdropBase';

// Larger than the line by the focus spacing on every side, with its own border: red while the line
// breaks a tempo limit, none while it's frozen (being translated)
const SPACING_X = CSSVar('mainTableFocusBackdropSpacingX');
const SPACING_Y = CSSVar('mainTableFocusBackdropSpacingY');

const Backdrop = styled(BackdropBase)`
  left: calc(${SPACING_X} * -1);
  margin-top: calc(${SPACING_Y} * -1);
  width: calc(100% + ${SPACING_X} * 2);
  opacity: ${CSSVar('mainTableFocusBackdropOpacity')};
  background: radial-gradient(
    circle at center bottom,
    ${CSSVar('mainTableFocusBackdropBg')} 0%,
    transparent 150%
  );
  border: ${CSSVar('mainTableFocusBackdropBorderWidth')} solid
    ${CSSVar('mainTableFocusBackdropBorderColor')};

  &.isTempoFailed {
    border-color: ${CSSVar('mainTableFocusBackdropBorderColorError')};
  }
  &.isFrozen {
    border-color: transparent;
  }
`;

type TFocusedLineBackdropProps = {
  geometry: TLineGeometry | null;
  isTempoFailed: boolean;
  isFrozen: boolean;
};

/** Under the focused line; nothing without one */
export function FocusedLineBackdrop({
  geometry,
  isTempoFailed,
  isFrozen,
}: TFocusedLineBackdropProps) {
  if (!geometry) return null;
  const placement = backdropMotion(geometry);
  return (
    <Backdrop
      className={classNames({ isTempoFailed: isTempoFailed && !isFrozen, isFrozen })}
      {...placement}
      // Grown by the focus spacing above and below (the margin moves it up by that much)
      style={{ height: `calc(${placement.style.height} + ${SPACING_Y} * 2)` }}
    />
  );
}

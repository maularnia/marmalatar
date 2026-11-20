import { TColor, TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar } from '@src/theme/utils';
import { css } from 'styled-components';

export type SpellCheckMark = {
  id: string;
  start: number;
  end: number;
  word: string;
};

// The wavy underline is drawn with gradients rather than an SVG image, so its color can come from
// a theme variable. Each half wave is an arc of a circle whose center lies beyond the wave's center
// line (so the arc is shallower than a half circle): two rows, each WAVE_PERIOD wide, alternate
// along the bottom edge -- the lower row holds the dips, the row above it the crests, shifted by
// half a period. All arcs start and end on the shared center line, so they join into one wave.
// As a background of an inline element, it follows the text onto the next line (each line's
// fragment carries its own slice of the repeated pattern). The bottom padding makes room for the
// wave under the glyphs; vertical padding doesn't shift an inline element's layout.
const WAVE_PERIOD = 8; // px, one full wave
const WAVE_AMPLITUDE = 1.5; // px, from the center line to a crest or a dip
const WAVE_STROKE = 0.6; // px
const WAVE_HALF_CHORD = WAVE_PERIOD / 4; // px, half the width of one arc
// The circle through both arc ends and its tip, and how far its center sits past the center line
const WAVE_RADIUS = (WAVE_HALF_CHORD ** 2 + WAVE_AMPLITUDE ** 2) / (2 * WAVE_AMPLITUDE);
const WAVE_CENTER_OFFSET = WAVE_RADIUS - WAVE_AMPLITUDE;
const WAVE_ROW_HEIGHT = WAVE_AMPLITUDE + WAVE_STROKE / 2;
const WAVE_EDGE = 0.3; // px, anti-aliasing on each side of the stroke

const waveRing = (color: string) =>
  `transparent ${WAVE_RADIUS - WAVE_STROKE / 2 - WAVE_EDGE}px,
   ${color} ${WAVE_RADIUS - WAVE_STROKE / 2}px ${WAVE_RADIUS + WAVE_STROKE / 2}px,
   transparent ${WAVE_RADIUS + WAVE_STROKE / 2 + WAVE_EDGE}px`;

export const getMarkCss = (color: TColor) => {
  const waveColor = CSSColor(color, TShade.DEFAULT, 50);
  return css`
    color: inherit;
    border-radius: ${CSSVar('markBorderRadius')};
    padding-bottom: ${WAVE_ROW_HEIGHT}px;
    background:
      radial-gradient(circle at 25% -${WAVE_CENTER_OFFSET}px, ${waveRing(waveColor)}) 0 100% /
        ${WAVE_PERIOD}px ${WAVE_ROW_HEIGHT}px repeat-x,
      radial-gradient(circle at 75% calc(100% + ${WAVE_CENTER_OFFSET}px), ${waveRing(waveColor)}) 0
        calc(100% - ${WAVE_ROW_HEIGHT}px) / ${WAVE_PERIOD}px ${WAVE_ROW_HEIGHT}px repeat-x,
      ${CSSColor(color, TShade.DEFAULT, 0)};
  `;
};

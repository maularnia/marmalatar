import { CSSVar } from '@src/theme/utils';
import { animateEaseOut } from '@src/toolkit/motion/transitions';
import { motion } from 'motion/react';
import styled from 'styled-components';

/** Where a line sits in the virtualized list: its top within the list's content, and its height
 * (including the gap below it) */
export type TLineGeometry = { top: number; height: number };

// A shared backdrop under the line rows: rendered as static content of the virtualized list,
// before the rows, so it lies beneath them, and placed over its line (see backdropMotion). It stops
// short of the gap below the line, like the rows' own backgrounds.
export const BackdropBase = styled(motion.div)`
  position: absolute;
  left: 0;
  width: 100%;
  border-radius: ${CSSVar('mainTableLineRadius')};
  pointer-events: none;
`;

/** Motion props placing a backdrop over a line: it slides to the line's top (fast, easing out) and
 * takes its height at once, minus the gap below it. It lands in place when it first appears. */
export const backdropMotion = ({ top, height }: TLineGeometry) => ({
  initial: false as const,
  animate: { top },
  transition: animateEaseOut.fast,
  style: { height: `calc(${height}px - ${CSSVar('mainTableLineSpacing')})` },
});

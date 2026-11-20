import { CSSVar } from '@src/theme/utils';
import { MotionProps } from 'motion/react';

// A quick mouse pass-by over the collapsed menu shouldn't trigger a full expand -- only a
// deliberate hover does, hence the delay on the "in" (expand) variant only. Exported so consumers
// (the menu's own unanimated width switch) can derive their own timing from the same numbers
// instead of hardcoding a second, potentially-drifting copy.
export const menuExpandDelay = 0.3;
export const menuWidthDuration = 0.2;

export const menuHoverExpand = {
  variants: {
    in: {
      width: CSSVar('appMenuExpandedWidth'),
      transition: { ease: 'circOut', duration: menuWidthDuration, delay: menuExpandDelay },
    },
    // Expanded at once: an overlay opening holds the sidebar open, which is no hover to wait for
    instant: {
      width: CSSVar('appMenuExpandedWidth'),
      transition: { duration: 0 },
    },
    out: {
      // Motion resolves the CSS variable to its px value when it animates to it
      width: CSSVar('appMenuCollapsedWidth'),
      transition: { ease: 'circOut', duration: menuWidthDuration },
    },
  },
} satisfies MotionProps;

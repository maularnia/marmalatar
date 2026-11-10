import { MotionProps } from 'motion/react';

// A quick mouse pass-by over the collapsed menu shouldn't trigger a full expand -- only a
// deliberate hover does, hence the delay on the "in" (expand) variant only. Exported so consumers
// (the menu's own unanimated width switch) can derive their own timing from the same numbers
// instead of hardcoding a second, potentially-drifting copy.
export const menuExpandDelay = 0.3;
export const menuWidthDuration = 0.3;

const menuCompactWidth = 34;
/** The expanded sidebar's width, in px: the static column on large screens, and the overlay a
 * collapsed sidebar expands into on smaller ones */
export const MENU_EXPANDED_WIDTH = 264;

export const menuHoverExpand = {
  variants: {
    in: {
      width: MENU_EXPANDED_WIDTH,
      transition: { type: 'spring', stiffness: 100, damping: 15, delay: menuExpandDelay },
    },
    out: {
      width: menuCompactWidth,
      transition: { ease: 'easeOut', duration: menuWidthDuration },
    },
  },
} satisfies MotionProps;

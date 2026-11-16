import { MotionProps, ValueTransition, Variants } from 'motion/react';

type TTransitionConfig = {
  slow: ValueTransition;
  default: ValueTransition;
  fast: ValueTransition;
};

const timeSlow = 0.66;
const timeDefault = 0.24;
const timeFast = 0.16;

const animateSpring: TTransitionConfig = {
  slow: { type: 'spring', mass: 1.5, damping: 12, stiffness: 50 },
  default: { type: 'spring', bounce: 0.3, damping: 20, stiffness: 350 },
  fast: { type: 'spring', bounce: 0.1, damping: 25, stiffness: 500 },
};

const animateInBack: TTransitionConfig = {
  slow: { ease: 'backIn', duration: timeSlow },
  default: { ease: 'backIn', duration: timeDefault },
  fast: { ease: 'backIn', duration: timeFast },
};
const animateEaseInOut: TTransitionConfig = {
  slow: { ease: 'easeInOut', duration: timeSlow },
  default: { ease: 'easeInOut', duration: timeDefault },
  fast: { ease: 'easeInOut', duration: timeFast },
};
export const animateEaseIn: TTransitionConfig = {
  slow: { ease: 'easeIn', duration: timeSlow },
  default: { ease: 'easeIn', duration: timeDefault },
  fast: { ease: 'easeIn', duration: timeFast },
};
export const animateEaseOut: TTransitionConfig = {
  slow: { ease: 'easeOut', duration: timeSlow },
  default: { ease: 'easeOut', duration: timeDefault },
  fast: { ease: 'easeOut', duration: timeFast },
};

const shiftYPos = '100%';
const shiftYNeg = '-100%';
const shiftXNeg = '-100%';
// const shiftXPos = '100%';

const appearUp = {
  initial: {
    y: shiftYPos,
    opacity: 0,
  },
  animate: {
    y: 0,
    opacity: 1,
  },
} satisfies MotionProps;

const appearRight = {
  initial: {
    x: shiftXNeg,
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
  },
} satisfies MotionProps;

// const appearLeft = {
//   initial: {
//     x: shiftXPos,
//     opacity: 0,
//   },
//   animate: {
//     x: 0,
//     opacity: 1,
//   },
// } satisfies MotionProps;

const appearDown = {
  initial: {
    y: shiftYNeg,
    opacity: 0,
  },
  animate: {
    y: 0,
    opacity: 1,
  },
} satisfies MotionProps;

const disappearDown = {
  exit: {
    y: shiftYPos,
    opacity: 0,
  },
} satisfies MotionProps;

const disapperUp = {
  exit: {
    y: shiftYNeg,
    opacity: 0,
  },
} satisfies MotionProps;

// const disapperLeft = {
//   exit: {
//     x: shiftYPos,
//     opacity: 0,
//   },
// } satisfies MotionProps;

const disapperRight = {
  exit: {
    x: shiftYNeg,
    opacity: 0,
  },
} satisfies MotionProps;

export const appearUpSpring = {
  initial: appearUp.initial,
  animate: {
    ...appearUp.animate,
    transition: {
      y: animateSpring.default,
      opacity: animateEaseOut.default,
    },
  },
  exit: {
    ...disapperUp.exit,
    transition: {
      y: animateInBack.default,
      opacity: animateEaseOut.default,
    },
  },
} satisfies MotionProps;

export const appearUpSpringSlow = {
  initial: appearUp.initial,
  animate: {
    ...appearUp.animate,
    transition: {
      y: animateSpring.slow,
      opacity: animateEaseOut.slow,
    },
  },
  exit: {
    ...disapperUp.exit,
    transition: {
      y: animateInBack.slow,
      opacity: animateEaseOut.default,
    },
  },
} satisfies MotionProps;

export const appearDownSpring = {
  initial: appearDown.initial,
  animate: {
    ...appearUp.animate,
    transition: {
      y: animateSpring.default,
      opacity: animateEaseOut.default,
    },
  },
  exit: {
    ...disappearDown.exit,
    transition: {
      y: animateEaseOut.default,
      opacity: animateEaseOut.default,
    },
  },
} satisfies MotionProps;

/** How long an overlay takes to slide in (appearRightEase's own timing): what its form waits before
 * starting its own appearance (FormsContent's `delay`) */
export const OVERLAY_APPEAR_DURATION = timeDefault;

export const appearRightEase = {
  initial: appearRight.initial,
  animate: {
    ...appearRight.animate,
    transition: {
      x: animateEaseInOut.default,
      opacity: animateEaseInOut.default,
    },
  },
  exit: {
    ...disapperRight.exit,
    transition: {
      x: animateEaseInOut.fast,
      opacity: animateEaseInOut.fast,
    },
  },
} satisfies MotionProps;

export const popOnFocus = {
  whileTap: {
    scale: 1.05,
    transition: {
      scale: animateSpring.fast,
    },
  },
  whileFocus: {
    scale: 1.05,
    transition: {
      scale: animateSpring.fast,
    },
  },
} satisfies MotionProps;

// How long each part of a staggered fly-in takes, whatever its delay
const FLY_IN_DURATION = 1;

/** Flies an element in from below (its own height down, transparent) over FLY_IN_DURATION. Give the
 * parts of a group increasing delays to stagger them: they overlap, each taking the same time. */
export const flyInFromBelow = (delay = 0) =>
  ({
    initial: { y: shiftYPos, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: { duration: FLY_IN_DURATION, delay, ease: [0.16, 1, 0.3, 1] },
    },
  }) satisfies MotionProps;

// ── Forms ────────────────────────────────────────────────────────────────────
// FormsContent / FormsRow / FormsSection (toolkit/forms.tsx) rendered with `animated` appear
// bottom-up in a cascade: the content staggers its rows, each row staggers
// its sections. Timing lives here; each usage may only pick a start delay.

// How far a form element starts below its place, how long it takes to arrive, and the gap between
// one element starting and the next
const FORM_APPEAR_SHIFT_Y = 16;
const FORM_APPEAR_DURATION = 0.3;
const FORM_APPEAR_STAGGER = 0.1;

const formAppearHidden = { opacity: 0, y: FORM_APPEAR_SHIFT_Y };
const formAppearVisible = { opacity: 1, y: 0 };
const formAppearTransition = { duration: FORM_APPEAR_DURATION, ease: 'easeOut' } as const;

/** A static page's content: rises in bottom-up, timed like the form elements */
// How long a static page waits before its content rises in
const STATIC_PAGE_APPEAR_DELAY = 0.3;

export const staticPageAppear = {
  initial: formAppearHidden,
  animate: {
    ...formAppearVisible,
    transition: { ...formAppearTransition, delay: STATIC_PAGE_APPEAR_DELAY },
  },
} satisfies MotionProps;

export const formAnimation = {
  /** The form content: starts the cascade after `delay`, staggering its rows */
  content: (delay = 0) =>
    ({
      initial: 'hidden',
      animate: 'visible',
      variants: {
        hidden: {},
        visible: {
          transition: { delayChildren: delay, staggerChildren: FORM_APPEAR_STAGGER },
        },
      },
    }) satisfies MotionProps,
  /** A row: appears bottom-up, then staggers its sections, starting `delay` after it starts */
  row: (delay = 0): Variants => ({
    hidden: formAppearHidden,
    visible: {
      ...formAppearVisible,
      transition: {
        ...formAppearTransition,
        delayChildren: delay,
        staggerChildren: FORM_APPEAR_STAGGER,
      },
    },
  }),
  /** A section: appears bottom-up */
  section: {
    hidden: formAppearHidden,
    visible: { ...formAppearVisible, transition: formAppearTransition },
  } satisfies Variants,
};

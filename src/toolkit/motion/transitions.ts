import { MotionProps, ValueTransition } from 'motion/react';

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
// const animateEaseIn: TTransitionConfig = {
//   slow: { ease: 'easeIn', duration: timeSlow },
//   default: { ease: 'easeIn', duration: timeDefault },
//   fast: { ease: 'easeIn', duration: timeFast },
// };
const animateEaseOut: TTransitionConfig = {
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

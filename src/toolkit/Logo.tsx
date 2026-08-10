import { TShade } from '@src/theme/definitions';
import { CSSColor, ThemeColors } from '@src/theme/utils';
import { motion, MotionProps } from 'motion/react';
import { appearUpSpringSlow } from './motion/transitions';

export enum TLogoVariant {
  DEFAULT = 'default',
  ERROR = 'error',
}

type LogoProps = {
  size?: number;
  variant?: TLogoVariant;
};

const LEFT_EYE_PATH =
  'M146.601 255.796C146.601 268.754 136.157 279.26 123.274 279.26C110.392 279.26 99.9482 268.754 99.9482 255.796C99.9482 242.837 110.392 232.331 123.274 232.331C136.157 232.331 146.601 242.837 146.601 255.796Z';
const RIGHT_EYE_PATH =
  'M260.052 248.875C260.052 264.592 247.135 277.334 231.202 277.334C215.268 277.334 202.352 264.592 202.352 248.875C202.352 233.157 215.268 220.415 231.202 220.415C247.135 220.415 260.052 233.157 260.052 248.875Z';

// "X" eyes, mapped from the source 45x45 shape onto the same spot/size as the default round eyes

const LEFT_EYE_ERROR_PATH =
  'M137.4592 274.8553C141.3675 270.9464 141.3673 264.6097 137.4586 260.7013L135.9841 259.2269L137.4536 257.7572C141.362 253.8482 141.3613 247.5111 137.4524 243.6026C133.5435 239.6944 127.2068 239.6946 123.2984 243.6032L121.8286 245.0732L120.3587 243.6036C116.4499 239.6953 110.1131 239.6955 106.2047 243.6041C102.2962 247.513 102.2964 253.8508 106.2053 257.7593L107.6749 259.2288L106.2007 260.7032C102.2925 264.612 102.2927 270.9488 106.2013 274.8572C110.1102 278.7656 116.448 278.7655 120.3565 274.8566L121.8305 273.3824L123.3047 274.8564C127.2136 278.7649 133.5508 278.7641 137.4592 274.8553Z';
const RIGHT_EYE_ERROR_PATH =
  'M257.7993 273.1797C263.3845 267.5936 263.3843 258.538 257.7985 252.9525L255.6912 250.8455L257.7912 248.7452C263.3766 243.1591 263.3757 234.1028 257.7895 228.5173C252.2035 222.9322 243.1478 222.9324 237.5624 228.5181L235.462 230.6189L233.3614 228.5187C227.7754 222.9336 218.7197 222.9338 213.1343 228.5195C207.5488 234.1056 207.549 243.1628 213.1351 248.7482L215.2354 250.8483L213.1286 252.9553C207.5435 258.5413 207.5437 267.597 213.1294 273.1824C218.7155 278.7678 227.7728 278.7676 233.3582 273.1816L235.4647 271.0748L237.5715 273.1812C243.1575 278.7668 252.2139 278.7657 257.7993 273.1797Z';

const catAnimation: MotionProps = {
  initial: {
    y: '100%',
  },
  animate: {
    y: 0,
    transition: {
      y: { type: 'spring', mass: 1, damping: 12, delay: 0.1 },
      opacity: { ...appearUpSpringSlow.animate.transition.opacity, delay: 0.1 },
    },
  },
};
const leftEyeAnimation: MotionProps = {
  initial: {
    scaleY: 0,
    y: '50%',
  },
  animate: {
    scaleY: [1, 0, 1, 1],
    y: 0,
    transition: {
      scaleY: {
        times: [0, 0.1, 0.3, 1],
        ease: 'easeInOut',
        repeat: Infinity,
        duration: 0.66,
        delay: 1.2,
        repeatDelay: 8,
      },
      y: {
        type: 'spring',
        delay: 0.6,
      },
    },
  },
};
const rightEyeAnimation: MotionProps = {
  initial: {
    y: '50%',
    scaleY: 0,
  },
  animate: {
    y: 0,
    scaleY: [1, 0, 1, 1],
    transition: {
      scaleY: {
        times: [0, 0.1, 0.3, 1],
        ease: 'easeInOut',
        repeat: Infinity,
        duration: 0.66,
        delay: 2.2,
        repeatDelay: 5,
      },
      y: {
        type: 'spring',
        delay: 0.6,
      },
    },
  },
};

const eyeGroupAnimation: MotionProps = {
  initial: {
    scaleY: 0,
    y: 20,
  },
  animate: {
    scaleY: 1,
    y: 20,
    transition: {
      scaleY: {
        ease: 'linear',
        duration: 0.1,
        delay: 0.64,
      },
    },
  },
};

export function Logo({ size = 64, variant = TLogoVariant.DEFAULT }: LogoProps) {
  const isError = variant === TLogoVariant.ERROR;
  const eyeColor = CSSColor(isError ? ThemeColors.RED : ThemeColors.ACCENT1, TShade.DEFAULT, 100);

  return (
    <motion.svg
      initial="initial"
      animate="animate"
      exit="exit"
      width={size}
      height={size}
      viewBox="0 0 360 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        <motion.path
          className="logo-body"
          d="M22.9932 359.983L336.942 359.916L337.008 -0.000183105H290.789L180.038 158.912L69.6021 0.0182017H22.9932V359.983Z"
          fill={CSSColor(ThemeColors.ACCENT1, TShade.DEFAULT, 100)}
          mask="url(#sneaky-cat)"
          {...appearUpSpringSlow}
        />
        <motion.g {...eyeGroupAnimation}>
          <motion.path
            className="logo-eye-right"
            d={isError ? RIGHT_EYE_ERROR_PATH : RIGHT_EYE_PATH}
            fill={eyeColor}
            {...rightEyeAnimation}
          />
          <motion.path
            className="logo-eye-left"
            d={isError ? LEFT_EYE_ERROR_PATH : LEFT_EYE_PATH}
            fill={eyeColor}
            {...leftEyeAnimation}
          />
        </motion.g>
      </g>
      <defs>
        <mask id="sneaky-cat">
          <rect className="mask-overlay" x={0} y={0} width="100%" height="100%" fill="white" />
          <motion.path
            className="logo-cat"
            d="M290.616 72.095V440.487H243.578V326.095H69.3848V72.5941L162.06 201.591H197.472L290.616 72.095Z"
            fill="black"
            {...catAnimation}
          />
        </mask>
      </defs>
    </motion.svg>
  );
}

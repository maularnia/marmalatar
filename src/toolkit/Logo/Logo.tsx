import { TShade } from '@src/theme/definitions';
import { CSSColor, ThemeColors } from '@src/theme/utils';
import { motion, MotionProps, ValueTransition } from 'motion/react';
import { useId } from 'react';
import { LOGO_MASK_PATH, LOGO_STROKE_PATH } from './paths';
import { animateEaseOut } from '../motion/transitions';

export enum TLogoVariant {
  DEFAULT = 'default',
  ERROR = 'error',
}

type TLogoProps = {
  size?: number;
  variant?: TLogoVariant;
};

const LEFT_EYE_PATH = 'M62 120.5a11.5 11.5 0 1 0 23 0a11.5 11.5 0 1 0 -23 0Z';
const RIGHT_EYE_PATH = 'M102 119a13 13 0 1 0 26 0a13 13 0 1 0 -26 0Z';

// "X" eyes, mapped from the source 45x45 shape onto the same spot/size as the default round eyes

const LEFT_EYE_ERROR_PATH =
  'M82.6995 129.6972C85.0000 127.3964 84.9999 123.6666 82.6992 121.3660L81.8313 120.4982L82.6962 119.6331C84.9968 117.3322 84.9964 113.6021 82.6955 111.3015C80.3947 109.0011 76.6648 109.0012 74.3643 111.3019L73.4992 112.1671L72.6340 111.3021C70.3332 109.0016 66.6033 109.0018 64.3028 111.3024C62.0022 113.6032 62.0023 117.3337 64.3031 119.6343L65.1681 120.4993L64.3004 121.3671C62.0000 123.6679 62.0001 127.3978 64.3008 129.6984C66.6016 131.9989 70.3321 131.9988 72.6327 129.6980L73.5003 128.8303L74.3680 129.6979C76.6688 131.9985 80.3990 131.9980 82.6995 129.6972Z';
const RIGHT_EYE_ERROR_PATH =
  'M125.3995 129.3969C128.0000 126.7959 127.9999 122.5796 125.3991 119.9789L124.4179 118.9979L125.3957 118.0200C127.9963 115.4191 127.9959 111.2024 125.3949 108.6017C122.7940 106.0013 118.5776 106.0014 115.9770 108.6021L114.9991 109.5802L114.0210 108.6024C111.4201 106.0019 107.2037 106.0020 104.6031 108.6027C102.0025 111.2037 102.0026 115.4208 104.6035 118.0214L105.5814 118.9992L104.6005 119.9802C102.0000 122.5811 102.0001 126.7975 104.6008 129.3981C107.2018 131.9987 111.4189 131.9986 114.0195 129.3978L115.0003 128.4168L115.9813 129.3976C118.5822 131.9983 122.7989 131.9978 125.3995 129.3969Z';

const LEFT_EYE_DELAY = 0.1;
// Counted from the moment the left eye starts appearing
const RIGHT_EYE_DELAY = LEFT_EYE_DELAY + 0.2;

const sceneAnimation = {
  initial: { y: '100%', opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: {
    y: { type: 'spring', bounce: 0.3, duration: 1 },
    // A spring overshoots past 1, which opacity can't show -- it would just read as an abrupt stop
    opacity: { ...animateEaseOut.default, duration: 0.5 },
  },
} satisfies MotionProps;

const strokeAnimation = {
  initial: { pathLength: 0 },
  animate: { pathLength: 1 },
  transition: { ...animateEaseOut.default, duration: 1 },
} satisfies MotionProps;

// Appearing lives on a wrapping group: the eye inside it owns scaleY for blinking, and sharing that
// value would have the two animations overwrite each other.
const eyeAppearAnimation = {
  initial: { scale: 0 },
  animate: { scale: 1 },
} satisfies MotionProps;

const eyeAppearTransition: ValueTransition = { type: 'spring', bounce: 0.3, duration: 0.3 };

const leftEyeBlinkAnimation = {
  animate: { scaleY: [1, 0, 1, 1] },
  transition: {
    times: [0, 0.1, 0.3, 1],
    ease: 'easeInOut',
    repeat: Infinity,
    duration: 0.66,
    delay: 1.2,
    repeatDelay: 8,
  },
} satisfies MotionProps;

const rightEyeBlinkAnimation = {
  animate: { scaleY: [1, 0, 1, 1] },
  transition: {
    times: [0, 0.1, 0.3, 1],
    ease: 'easeInOut',
    repeat: Infinity,
    duration: 0.66,
    delay: 2.2,
    repeatDelay: 5,
  },
} satisfies MotionProps;

export function Logo({ size = 64, variant = TLogoVariant.DEFAULT }: TLogoProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const maskId = `logo-mask-${uid}`;
  const gradientId = `logo-gradient-${uid}`;
  const isError = variant === TLogoVariant.ERROR;
  // Non-error eyes sit at the gradient's midpoint rather than pure ACCENT1, so they blend with the
  // logo-body gradient instead of reading as a flat dot dropped on top of it.
  const eyeColor = isError
    ? CSSColor(ThemeColors.RED, TShade.DEFAULT, 100)
    : `color-mix(in srgb, ${CSSColor(ThemeColors.ACCENT1, TShade.DEFAULT, 100)} 50%, ${CSSColor(ThemeColors.ACCENT2, TShade.DEFAULT, 100)} 50%)`;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 185 185"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...sceneAnimation}
    >
      <defs>
        {/* Same diagonal ACCENT1 -> ACCENT2 gradient as the "special" icon variant in Icon.tsx --
            applied directly here via stroke, since this path (unlike arbitrary icon SVGs) is fully
            under our control and doesn't need the feImage/feComposite filter trick. */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={CSSColor(ThemeColors.ACCENT1, TShade.DEFAULT, 100)} />
          <stop offset="100%" stopColor={CSSColor(ThemeColors.ACCENT2, TShade.DEFAULT, 100)} />
        </linearGradient>
        <mask
          id={maskId}
          style={{ maskType: 'alpha' }}
          maskUnits="userSpaceOnUse"
          x="17"
          y="4"
          width="150"
          height="177"
        >
          <path d={LOGO_MASK_PATH} fill="white" />
        </mask>
      </defs>

      <g mask={`url(#${maskId})`}>
        <motion.path
          d={LOGO_STROKE_PATH}
          stroke={`url(#${gradientId})`}
          strokeWidth={33}
          {...strokeAnimation}
        />
      </g>

      <motion.g
        {...eyeAppearAnimation}
        transition={{ ...eyeAppearTransition, delay: LEFT_EYE_DELAY }}
      >
        <motion.path
          d={isError ? LEFT_EYE_ERROR_PATH : LEFT_EYE_PATH}
          fill={eyeColor}
          {...leftEyeBlinkAnimation}
        />
      </motion.g>
      <motion.g
        {...eyeAppearAnimation}
        transition={{ ...eyeAppearTransition, delay: RIGHT_EYE_DELAY }}
      >
        <motion.path
          d={isError ? RIGHT_EYE_ERROR_PATH : RIGHT_EYE_PATH}
          fill={eyeColor}
          {...rightEyeBlinkAnimation}
        />
      </motion.g>
    </motion.svg>
  );
}

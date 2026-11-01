import { TShade } from '@src/theme/definitions';
import { CSSColor, ThemeColors } from '@src/theme/utils';
import { motion, MotionProps } from 'motion/react';
import { useId } from 'react';
import { LOGO_MASK_PATH, LOGO_STROKE_PATH } from './Logo/paths';

const EYE_DURATION = 0.3;
const RIGHT_EYE_DELAY = 0.1;
// Counted from the moment the right eye starts appearing
const STROKE_DELAY = RIGHT_EYE_DELAY + 0.2;
const STROKE_PHASE_DURATION = 1;

const eyeAnimation = {
  initial: { opacity: 0, scale: 0 },
  animate: { opacity: 1, scale: 1 },
} satisfies MotionProps;

const strokeAnimation = {
  initial: { pathLength: 0, pathOffset: 0 },
  // Fill: the dash grows from the path start. Empty: the dash start chases its end, so the stroke
  // leaves in the same direction it came in. Both ends of the loop are an empty stroke, which makes
  // the repeat seamless.
  animate: {
    pathLength: [0, 1, 1],
    pathOffset: [0, 0, 1],
  },
  transition: {
    delay: STROKE_DELAY,
    duration: STROKE_PHASE_DURATION * 2,
    times: [0, 0.5, 1],
    // Any easing that slows down at the keyframes would read as a pause between the phases
    ease: 'linear',
    repeat: Infinity,
  },
} satisfies MotionProps;

type TLogoLoaderProps = {
  size?: number;
};

export function LogoLoader({ size = 64 }: TLogoLoaderProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const maskId = `logo-loader-mask-${uid}`;
  const gradientId = `logo-loader-gradient-${uid}`;
  const accent1 = CSSColor(ThemeColors.ACCENT1, TShade.DEFAULT, 100);
  const accent2 = CSSColor(ThemeColors.ACCENT2, TShade.DEFAULT, 100);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 185 185"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={accent1} />
          <stop offset="100%" stopColor={accent2} />
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

      <motion.circle
        cx="73.5"
        cy="120.5"
        r="11.5"
        fill={accent1}
        {...eyeAnimation}
        transition={{ duration: EYE_DURATION, ease: 'easeOut' }}
      />
      <motion.circle
        cx="115"
        cy="119"
        r="13"
        fill={accent1}
        {...eyeAnimation}
        transition={{ duration: EYE_DURATION, ease: 'easeOut', delay: RIGHT_EYE_DELAY }}
      />
    </svg>
  );
}

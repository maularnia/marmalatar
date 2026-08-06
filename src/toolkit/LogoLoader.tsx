import { motion } from 'motion/react';
import { useId } from 'react';

// LM filled shapes — used only as clip mask
const L_PATH = 'M50 218V38H73.1042V201.054H160.373V218H50Z';
const M_PATH =
  'M50.1674 218V38H73.2717L128.521 117.456L183.896 38H207V218H183.896V74.0251L137.311 138.795H119.606L73.2717 74.2762V218H50.1674Z';

// Single unclosed skeleton running through the letterforms:
// start at L-foot right end → left along foot → up left bar → M left diagonal
// → M right diagonal → down M right bar
const SKELETON_PATH = 'M160.4 209.5 L61.7 209.5 L61.7 38 L128.5 117.5 L195.5 38 L195.5 218';

const EYE1_PATH =
  'M100.227 173.816C100.227 177.513 97.2283 180.51 93.5297 180.51C89.8311 180.51 86.8328 177.513 86.8328 173.816C86.8328 170.119 89.8311 167.121 93.5297 167.121C97.2283 167.121 100.227 170.119 100.227 173.816Z';
const EYE2_PATH =
  'M172.553 164.444C172.553 170.359 167.756 175.155 161.838 175.155C155.92 175.155 151.123 170.359 151.123 164.444C151.123 158.528 155.92 153.732 161.838 153.732C167.756 153.732 172.553 158.528 172.553 164.444Z';

type LogoLoaderProps = {
  size?: number;
};

export function LogoLoader({ size = 64 }: LogoLoaderProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const clipId = `ll-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={L_PATH} />
          <path d={M_PATH} />
        </clipPath>
      </defs>

      {/* Skeleton stroke clipped to letterform silhouette */}
      <g clipPath={`url(#${clipId})`}>
        <motion.path
          d={SKELETON_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth={40}
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{
            pathLength: [0, 1, 1],
            pathOffset: [0, 0, 1],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            times: [0, 0.45, 1],
            ease: ['easeInOut', 'easeInOut'],
          }}
        />
      </g>

      {/* Eyes always visible, outside the clip */}
      <path d={EYE1_PATH} fill="currentColor" />
      <path d={EYE2_PATH} fill="currentColor" />
    </svg>
  );
}

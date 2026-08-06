import { TColor } from '@src/theme/definitions';
import { TTheme } from '@src/theme/types';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { HTMLMotionProps } from 'motion/react';
import { PropsWithChildren, Ref } from 'react';

export enum TButtonSize {
  'LARGE' = 'large',
  'REGULAR' = 'default',
  'SMALL' = 'small',
  'NANO' = 'nano',
}

export enum TButtonVariant {
  'SPECIAL' = 'special',
  'SECONDARY_SPECIAL' = 'secondary-special',
  'PRIMARY' = 'primary',
  'SECONDARY' = 'secondary',
  'TRANSPARENT' = 'transparent',
  'TRANSPARENT_SPECIAL' = 'transparent-speacial',
}

interface ButtonLocalProps {
  ref?: Ref<HTMLButtonElement>;
  color?: TColor;
  icon?: TIcon;
  compact?: boolean;
  size?: TButtonSize;
  variant?: TButtonVariant;
  forceIconic?: boolean;
}

export type TButtonProps = ButtonLocalProps &
  Omit<HTMLMotionProps<'button'>, 'size' | 'children'> &
  PropsWithChildren;

export type TButtonStyledProps = {
  $theme: TTheme;
  $color: TColor;
  $size: TButtonSize;
  $variant: TButtonVariant;
  $iconic: boolean;
  $withContent: boolean;
};

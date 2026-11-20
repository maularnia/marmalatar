import { TColor } from '@src/theme/definitions';
import { TTheme } from '@src/theme/types';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { HTMLMotionProps } from 'motion/react';
import { PropsWithChildren, Ref } from 'react';

export enum TButtonSize {
  LARGE = 'large',
  REGULAR = 'default',
  SMALL = 'small',
  NANO = 'nano',
}

export enum TButtonVariant {
  SPECIAL = 'special',
  SECONDARY_SPECIAL = 'secondary-special',
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TRANSPARENT = 'transparent',
  TRANSPARENT_SPECIAL = 'transparent-speacial',
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

/** CSS custom property a parent can set on a Button to change its corner radius (any
 * `border-radius` value, e.g. `4px 0 0 4px`). The radius is drawn on an inner pseudo-element, so
 * setting `border-radius` on the button itself has no effect. Unset, the theme's input radius
 * applies. */
export const BUTTON_BORDER_RADIUS_VAR = '--button-border-radius';

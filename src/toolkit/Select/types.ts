import type { TColor } from '@src/theme/definitions';
import type { TIcon } from '@ui-toolkit/Icon/icons';
import type { ReactNode } from 'react';

// Kept apart from Select.tsx so code that only needs the option shape (the AI connector config,
// for one) doesn't import the component and, through it, the settings service.

export type TOptionSelect = {
  value: string;
  label: string | null;
  color?: TColor;
  isDisabled?: boolean;
  icon?: TIcon;
  emoji?: ReactNode;
};

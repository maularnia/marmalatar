import { TColor } from '@src/theme/definitions';
import { ReactNode } from 'react';

export type TOptionLineComposer = {
  value: string;
  color?: TColor;
  label: ReactNode;
};

type LineComposerValue = string[];
type LineComposerOnChange = (values: LineComposerValue) => void;

export type LineComposerProps = {
  options: TOptionLineComposer[];
  value: LineComposerValue;
  separator: string;
  onChange: LineComposerOnChange;
  allowDuplicates?: boolean;
};

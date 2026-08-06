import { TColor } from '@src/theme/definitions';

export type TOptionJSONComposer = {
  value: string;
  label: string;
  color?: TColor;
};

type JSONComposerEntry = [fieldName: string, optionValue: string];
type JSONComposerValue = JSONComposerEntry[];
type JSONComposerOnChange = (value: JSONComposerValue) => void;

export type JSONComposerProps = {
  value: JSONComposerValue;
  options: TOptionJSONComposer[];
  onChange: JSONComposerOnChange;
  errors?: string[];
};

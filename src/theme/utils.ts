import {
  TCSSColorVarName,
  TColor,
  TColorAccent,
  TColorCustom,
  TColorSystem,
  TOpacity,
  TShade,
} from './definitions';
import { TCSSVarNames } from './types';
import { getThemeColorVariableNane } from './ThemeVariable';
import { camelToKebab } from '../utils/string';

export const ThemeColors = {
  ...TColorSystem,
  ...TColorAccent,
  ...TColorCustom,
} as const;

export const ThemeShades = Object.values(TShade);

export const CSSVar = (varName: TCSSVarNames): string => `var(${camelToKebab(varName)})`;

export const CSSColor = (
  ...params: [color: TColor, shade: TShade, opacity: TOpacity]
): `var(${TCSSColorVarName})` => {
  return `var(${getThemeColorVariableNane(...params)})`;
};

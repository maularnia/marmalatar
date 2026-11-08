import {
  TColor,
  TCSSColorVarName,
  TOpacity,
  TShade,
  TThemeColorMap,
  TThemeName,
} from '@src/theme/definitions';
import { TThemeStaticVars } from '@src/theme/types/static';
import { TThemeVarsTheme } from '@src/theme/types/theme';

export type TCSSVarNames = {
  [K in keyof (TThemeStaticVars & TThemeVarsTheme)]: (TThemeStaticVars &
    TThemeVarsTheme)[K] extends {
    isCSS: false;
  }
    ? never
    : K;
}[keyof (TThemeStaticVars & TThemeVarsTheme)];

export type TThemeRegistryEntry = {
  colors: TThemeColorMap;
  variables: TThemeVarsTheme;
};

export type TTheme = {
  colors: {
    [key in TColor]: {
      [key in TShade]: { [key in TOpacity]: `var(${TCSSColorVarName})` };
    } & { text: TColor };
  };
  variables: TThemeVarsTheme;
};

export type TThemeExporter = (theme: TThemeColorMap, baseVars: TThemeStaticVars) => TThemeVarsTheme;

type TThemeDefinition = {
  colors: TThemeColorMap;
  variables: TThemeExporter;
};

export type TThemeDefinitionMap<
  T extends Record<string, TThemeDefinition> = Record<string, TThemeDefinition>,
> = { [key in TThemeName]: TThemeDefinition } & T;

export type TThemesMap<T extends Record<string, TTheme> = Record<string, TTheme>> = {
  [key in TThemeName]: TTheme;
} & T;

export type TThemeRenderer = (
  theme: TThemeRegistryEntry,
  themeName: string,
  isDefault?: TThemeName
) => string;

export enum TScreenSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

import { TCSSColorValue, TColor, TOpacity, TShade, TThemeColorMap } from './definitions';
import { TThemeRenderer, TThemeDefinitionMap } from './types';
import { TThemeVarsTheme } from './types/theme';
import { getThemeColorVariableNane } from './ThemeVariable';
import { allOpacities, staticVars } from './static';
import { ThemeShades } from './utils';
import * as dark from './themes/dark';
import * as light from './themes/light';

const opacifyHSL = (hsl: TCSSColorValue, opacity: TOpacity): string => {
  if (hsl === 'transparent') return hsl;
  const match = hsl.match(/hsl\(\s*(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?%)[,\s]+(\d+(?:\.\d+)?%)/);
  if (!match) return hsl;
  const [, h, s, l] = match;
  return `hsl(${h} ${s} ${l} / ${opacity / 100})`;
};

const getThemeColorVariableCSSDefinition = (
  colors: TThemeColorMap,
  color: TColor,
  shade: TShade | 'text',
  opacity: TOpacity
) => {
  if (shade === 'text') {
    return `${getThemeColorVariableNane(color, shade, opacity)}: ${opacifyHSL(colors[colors[color]['text']]['default'], opacity)};`;
  }
  return `${getThemeColorVariableNane(color, shade, opacity)}: ${opacifyHSL(colors[color][shade], opacity)};`;
};

export const renderThemeCSS: TThemeRenderer = (
  { colors, variables },
  themeName: string,
  isDefault?: 'light' | 'dark'
) => {
  const allColors = Object.keys(colors) as TColor[];
  let cssVariables = '';

  for (const color of allColors) {
    for (const shade of ThemeShades) {
      for (const opacity of allOpacities) {
        cssVariables += `  ${getThemeColorVariableCSSDefinition(colors, color, shade, opacity)}\n`;
      }
    }
    for (const opacity of allOpacities) {
      cssVariables += `  ${getThemeColorVariableCSSDefinition(colors, color, 'text', opacity)}\n`;
    }
  }

  for (const variableName in variables) {
    const variable = variables[variableName as keyof typeof variables];
    if (!variable.isCSS || !variable.cssDefinition) continue;
    cssVariables += `  ${variable.cssDefinition}\n`;
  }

  let css = `body.theme-${themeName} {\n${cssVariables}}\n`;

  if (isDefault === 'light') {
    css += `\n@media (prefers-color-scheme: light) {\n  body {\n${cssVariables}  }\n}\n`;
  } else if (isDefault === 'dark') {
    css += `\n@media (prefers-color-scheme: dark) {\n  body {\n${cssVariables}  }\n}\n`;
  }

  return css;
};

export const renderStaticCSS = (): string => {
  let result = '';
  for (const key in staticVars) {
    const variable = staticVars[key as keyof typeof staticVars];
    if (!variable.isCSS || !variable.cssDefinition) continue;
    result += `  ${variable.cssDefinition}\n`;
  }
  return `body {\n${result}}\n`;
};

type ThemeRegistry = Record<string, { colors: TThemeColorMap; variables: TThemeVarsTheme }>;

const themeDefinitions: TThemeDefinitionMap = {
  light,
  dark,
};

export const themeRegistry: ThemeRegistry = Object.keys(themeDefinitions).reduce(
  (registry, themeKey) => {
    registry[themeKey] = {
      colors: themeDefinitions[themeKey].colors,
      variables: themeDefinitions[themeKey].variables(
        themeDefinitions[themeKey].colors,
        staticVars
      ),
    };
    return registry;
  },
  {} as ThemeRegistry
);

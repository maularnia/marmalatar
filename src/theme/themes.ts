import { TCSSColorVarName, TColor, TOpacity, TShade } from './definitions';
import { TTheme, TThemeRegistryEntry, TThemesMap } from './types';
import { themeRegistry } from './renderer';
import { allOpacities } from './static';
import { getThemeColorVariableNane } from './ThemeVariable';
import { ThemeShades } from './utils';

type TThemeBuilder = (props: TThemeRegistryEntry) => TTheme;

const buildTheme: TThemeBuilder = ({ colors, variables }) => {
  const result = { colors: {}, variables } as TTheme;

  const allColors = Object.keys(colors) as TColor[];

  for (const color of allColors) {
    result.colors[color] = { text: colors[color].text } as {
      [key in TShade]: { [key in TOpacity]: `var(${TCSSColorVarName})` };
    } & {
      text: TColor;
    };

    for (const shade of ThemeShades) {
      result.colors[color][shade] = {} as {
        [key in TOpacity]: `var(${TCSSColorVarName})`;
      };

      for (const opacity of allOpacities) {
        const variableName = getThemeColorVariableNane(color, shade, opacity);
        result.colors[color][shade][opacity] = `var(${variableName})`;
      }
    }
  }

  return result;
};

export const themes: TThemesMap = {
  dark: buildTheme(themeRegistry.dark),
  light: buildTheme(themeRegistry.light),
};

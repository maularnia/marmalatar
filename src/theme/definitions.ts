/**
 * Special system color values
 */
export enum TColorSystem {
  'TEXT' = 'text',
  'BG' = 'bg',
  'WHITE' = 'white',
  'BLACK' = 'black',
  'TRANSPARENT' = 'transparent',
}

/**
 * Theme accent colors can be as meany as needed. Usually, but not necessarily, proxy names for custom colors
 */
export enum TColorAccent {
  'ACCENT1' = 'accent1',
  'ACCENT2' = 'accent2',
}

/**
 * List of custom colors
 */
export enum TColorCustom {
  MAHOGANY = 'mahogany',
  ALICEBLUE = 'aliceblue',
  YELLOW = 'yellow',
  ORANGE = 'orange',
  BLUE = 'blue',
  AQUA = 'aqua',
  TARQUOISE = 'tarquoise',
  JADE = 'jade',
  GREEN = 'green',
  BRIGHTGREEN = 'brightgreen',
  PINK = 'pink',
  DARKPINK = 'palepink',
  VIOLET = 'violet',
  EARLYNIGHT = 'earlynight',
  RED = 'red',
  SCARLET = 'scarlet',
  TANGERINE = 'tangerine',
  GOLD = 'gold',
  LIME = 'lime',
  CHARTREUSE = 'chartreuse',
  FOREST = 'forest',
  MINT = 'mint',
  CYAN = 'cyan',
  SKY = 'sky',
  AZURE = 'azure',
  INDIGO = 'indigo',
  PURPLE = 'purple',
  FUCHSIA = 'fuchsia',
  ROSE = 'rose',
  CRIMSON = 'crimson',
}

/**
 * List of shade names for each color
 */
export enum TShade {
  'DARK' = 'dark',
  'DIMM' = 'dimm',
  'BRIGHT' = 'bright',
  'DEFAULT' = 'default',
  'PALE' = 'light',
}

/**
 * Allowed system opacity values
 */
export type TOpacity =
  | 0
  | 5
  | 10
  | 15
  | 20
  | 25
  | 30
  | 35
  | 40
  | 45
  | 50
  | 55
  | 60
  | 65
  | 70
  | 75
  | 80
  | 85
  | 90
  | 95
  | 100;

export type TColor = TColorSystem | TColorAccent | TColorCustom;

/**
 * System color value format
 */
export type TCSSColorValue =
  | `hsl(${number}, ${number}%, ${number}%)`
  | `hsl(${number} ${number}% ${number}%)`
  | 'transparent';

export type TCSSColorVarName = `--color-${TColor}-${TShade | 'text'}-${TOpacity}`;

export type TColorDefinition = {
  [key in TShade]: TCSSColorValue;
} & {
  text: TColor;
};
export type TThemeColorMap = { [key in TColor]: TColorDefinition };

export enum TThemeName {
  'LIGHT' = 'light',
  'DARK' = 'dark',
}

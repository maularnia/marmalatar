import { camelToKebab } from '../utils/string';
import { TCSSColorVarName, TColor, TOpacity, TShade } from './definitions';

type CSSExporterProps<T> = { name: string; value: T };
type CSSDefinition = `--${string}: ${string};`;
export type CSSExtractor<T> = (props: CSSExporterProps<T>) => CSSDefinition;

type IsCSS<Extractor> = Extractor extends false ? false : true;
type CSSDefinitionFiledType<Extractor> = Extractor extends false ? null : CSSDefinition;

const defaultCSSValueExporter = <T>({ name, value }: CSSExporterProps<T>): CSSDefinition =>
  `${camelToKebab(name)}: ${value};` as CSSDefinition;

export class ThemeVariable<
  T,
  N extends string,
  Extractor extends CSSExtractor<T> | false | undefined = undefined,
> {
  constructor(name: N, value: T, css?: Extractor) {
    this.cssDefinition = (
      css == false ? null : css ? css({ name, value }) : defaultCSSValueExporter({ name, value })
    ) as CSSDefinitionFiledType<Extractor>;
    this.value = value;
    this.name = name;
    this.isCSS = (css !== false) as IsCSS<Extractor>;
  }

  public readonly name: N;
  public readonly value: T;
  public readonly cssDefinition: CSSDefinitionFiledType<Extractor>;
  public readonly isCSS: IsCSS<Extractor>;
  public readonly register = (): { [key in N]: ThemeVariable<T, N, Extractor> } => {
    return { [this.name]: this } as unknown as { [key in N]: ThemeVariable<T, N, Extractor> };
  };
}

export const getThemeColorVariableNane = (
  color: TColor,
  shade: TShade | 'text',
  opacity: TOpacity
): TCSSColorVarName => {
  return `--color-${color}-${shade}-${opacity}`;
};

/**
 * Type guards for ThemeVariable's value/name literal type inference
 */
export const asOpacity = (opacity: TOpacity) => opacity;

export const asShade = (shade: TShade) => shade;

export const asColor = (color: TColor) => color;

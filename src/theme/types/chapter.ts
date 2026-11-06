import type { CSSExtractor, ThemeVariable } from '@src/theme/ThemeVariable';

// The shape of one chapter of theme variables, from its spec. In its own file so the chapter
// definitions (static.ts, theme.ts) don't import types.ts, which assembles them.

type ExtractSpec<K extends string, V> = V extends readonly [infer T, false]
  ? ThemeVariable<T, K, false>
  : V extends readonly [infer T, infer E]
    ? ThemeVariable<T, K, E extends CSSExtractor<T> ? E : never>
    : ThemeVariable<V, K>;

export type TThemeVarsChapter<Spec extends Record<string, unknown>> = {
  [K in keyof Spec & string]: ExtractSpec<K, Spec[K]>;
};

export const SUPPORTED_UI_LOCALES = ['en', 'be', 'be-Latn'] as const;

export type TUiLocale = (typeof SUPPORTED_UI_LOCALES)[number];

export const UI_LOCALE_LABELS: Record<TUiLocale, string> = {
  en: 'English',
  be: 'Беларуская',
  'be-Latn': 'Biełaruskaja (łacinka)',
};

export const UI_LOCALE_FLAGS: Record<TUiLocale, string> = {
  en: '🇬🇧',
  be: '🇧🇾',
  'be-Latn': '🇧🇾',
};

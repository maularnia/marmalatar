import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@src/i18n';
import { LANGUAGE_FLAGS, TLanguage } from '@src/types';

const t = i18n.getFixedT(null, 'app');

/** Non-reactive lookup for use outside components (e.g. service-layer error messages). */
export function getLocalizedLanguageLabel(lang: TLanguage): string {
  return t(`languages.${lang}`);
}

/** Localized display name per TLanguage, reactive to the current UI locale. */
export function useLanguageLabels(): Record<TLanguage, string> {
  const { t } = useTranslation('app');
  return useMemo(
    () =>
      Object.fromEntries(
        Object.values(TLanguage).map((lang) => [lang, t(`languages.${lang}`)])
      ) as Record<TLanguage, string>,
    [t]
  );
}

/** Localized, flag-annotated options for language `<Select>`s, sorted by the localized label. */
export function useLanguageOptions(): Array<{ value: TLanguage; label: string; emoji: string }> {
  const labels = useLanguageLabels();
  return useMemo(
    () =>
      Object.values(TLanguage)
        .map((lang) => ({ value: lang, label: labels[lang], emoji: LANGUAGE_FLAGS[lang] }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [labels]
  );
}

/** The locale of an app language code (BE_be → be), for sorting and casing words in that
 * language. undefined for anything that isn't such a code. */
export function getLanguageLocale(languageCode: string): string | undefined {
  return /^[A-Z]{2}_([a-z]{2})$/.exec(languageCode)?.[1];
}

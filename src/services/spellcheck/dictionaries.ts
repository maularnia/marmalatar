import { TLanguage } from '@src/types';
import i18n from '@src/i18n';

const t = i18n.getFixedT(null, 'errors');

export type DictionaryDescriptor = {
  locale: string;
  affUrl: string;
  dicUrl: string;
};

// Globbed rather than individually imported so adding a language stays a one-line addition below
// -- Vite resolves each matched file to its final build URL, so these are safe to fetch() at
// runtime exactly like the old public/ paths, but computed correctly regardless of how/where the
// app is loaded from (dev server vs. packaged file://).
const affUrls = import.meta.glob<string>('../../assets/dictionaries/**/*.aff', {
  eager: true,
  query: '?url',
  import: 'default',
});
const dicUrls = import.meta.glob<string>('../../assets/dictionaries/**/*.dic', {
  eager: true,
  query: '?url',
  import: 'default',
});

function findUrl(map: Record<string, string>, locale: string, extension: string): string {
  const suffix = `/${locale}/${locale}.${extension}`;
  const key = Object.keys(map).find((k) => k.endsWith(suffix));
  if (!key) throw new Error(t('spellcheck.missingDictionaryAsset', { suffix }));
  return map[key];
}

function dictionary(locale: string): DictionaryDescriptor {
  return {
    locale,
    affUrl: findUrl(affUrls, locale, 'aff'),
    dicUrl: findUrl(dicUrls, locale, 'dic'),
  };
}

export const DICTIONARIES: Record<TLanguage, DictionaryDescriptor> = {
  [TLanguage.English]: dictionary('en'),
  [TLanguage.German]: dictionary('de'),
  [TLanguage.Spanish]: dictionary('es'),
  [TLanguage.Italian]: dictionary('it'),
  [TLanguage.Belarusian]: dictionary('be'),
  [TLanguage.Ukrainian]: dictionary('uk'),
  [TLanguage.Polish]: dictionary('pl'),
};

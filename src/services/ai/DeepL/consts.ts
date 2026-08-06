import { TLanguage } from '@src/types';
import i18n from '@src/i18n';
import { getLocalizedLanguageLabel } from '@src/utils/languageLabels';
import { TOptionSelect } from '@ui-toolkit/Select/Select';

const t = i18n.getFixedT(null, 'errors');

// deepl-node's TypeScript types are strict lowercase literal unions, and additionally distinguish
// source vs. target codes for English (source: 'en', target must be a regional variant --
// 'en-US'/'en-GB', no bare 'en' target) -- so source/target need their own maps rather than one
// shared code per language.
const DEEPL_SOURCE_LANGUAGE_CODES: Partial<Record<TLanguage, string>> = {
  [TLanguage.English]: 'en',
  [TLanguage.German]: 'de',
  [TLanguage.Spanish]: 'es',
  [TLanguage.Italian]: 'it',
  [TLanguage.Belarusian]: 'be',
  [TLanguage.Ukrainian]: 'uk',
  [TLanguage.Polish]: 'pl',
};

const DEEPL_TARGET_LANGUAGE_CODES: Partial<Record<TLanguage, string>> = {
  [TLanguage.English]: 'en-US',
  [TLanguage.German]: 'de',
  [TLanguage.Spanish]: 'es',
  [TLanguage.Italian]: 'it',
  [TLanguage.Belarusian]: 'be',
  [TLanguage.Ukrainian]: 'uk',
  [TLanguage.Polish]: 'pl',
};

// Languages DeepL does not support native glossaries for (per DeepL's own language support data,
// e.g. Belarusian) -- the single source of truth for both the DeepLSettingsForm warning/disabled
// glossary field and deeplClient.ts's proactive omission of glossary_id for these language pairs.
export const DEEPL_LANGUAGES_WITHOUT_GLOSSARY_SUPPORT: TLanguage[] = [TLanguage.Belarusian];

// Languages DeepL does not support the `formality` parameter for as a TARGET language (formality
// is target-only -- it controls the register of the generated text, so the source language is
// irrelevant here, unlike glossaries which are direction-specific). Confirmed via a live "Target
// language 'be' doesn't support formality" API error for Belarusian; English and Ukrainian are
// included based on DeepL's documented formality-supported-language list (DE/FR/IT/ES/NL/PL/PT/
// JA/RU and similar are supported, EN/UK historically are not) -- VERIFY against a live
// `GET /v2/languages?type=target` call (`supports_formality` field) before fully trusting this,
// same caveat as the language-code maps above.
export const DEEPL_LANGUAGES_WITHOUT_FORMALITY_SUPPORT: TLanguage[] = [
  TLanguage.English,
  TLanguage.Belarusian,
  TLanguage.Ukrainian,
];

export function resolveDeepLSourceLanguageCode(lang: TLanguage): string {
  const code = DEEPL_SOURCE_LANGUAGE_CODES[lang];
  if (!code)
    throw new Error(t('deepL.languageUnsupported', { language: getLocalizedLanguageLabel(lang) }));
  return code;
}

export function resolveDeepLTargetLanguageCode(lang: TLanguage): string {
  const code = DEEPL_TARGET_LANGUAGE_CODES[lang];
  if (!code)
    throw new Error(t('deepL.languageUnsupported', { language: getLocalizedLanguageLabel(lang) }));
  return code;
}

export const DEEPL_FORMALITY_OPTIONS: TOptionSelect[] = [
  { value: 'default', label: 'Default' },
  { value: 'more', label: 'More formal' },
  { value: 'less', label: 'Less formal' },
  { value: 'prefer_more', label: 'Prefer more formal' },
  { value: 'prefer_less', label: 'Prefer less formal' },
];
export const DEFAULT_DEEPL_FORMALITY = 'default';

export const DEEPL_MODEL_TYPE_OPTIONS: TOptionSelect[] = [
  { value: 'prefer_quality_optimized', label: 'Prefer quality optimized' },
  { value: 'quality_optimized', label: 'Quality optimized' },
  { value: 'latency_optimized', label: 'Latency optimized' },
];
export const DEFAULT_DEEPL_MODEL_TYPE = 'prefer_quality_optimized';

export const DEEPL_NO_GLOSSARY_VALUE = '';

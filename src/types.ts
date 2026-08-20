import { TColor } from './theme/definitions';

export enum TThemeSelection {
  DARK = 'dark',
  LIGHT = 'light',
  SYSTEM = 'system',
}

export enum TLanguage {
  English = 'EN_en',
  German = 'DE_de',
  Spanish = 'ES_es',
  Italian = 'IT_it',
  Belarusian = 'BE_be',
  Ukrainian = 'UK_uk',
  Polish = 'PL_pl',
}

/**
 * Canonical English language names -- deliberately NOT localized. Used only where a language name
 * is sent as context to an AI backend (see aiTranslation.ts's buildContext) or embedded in
 * exported file names/metadata (see Export.tsx), both of which must stay stable and decoupled from
 * the app's current UI locale. Anything the user actually reads (selectors, inline messages)
 * should use the localized labels from useLanguageLabels/useLanguageOptions in
 * src/utils/languageLabels.ts instead.
 */
export const LANGUAGE_LABELS: Record<TLanguage, string> = {
  [TLanguage.English]: 'English',
  [TLanguage.German]: 'German',
  [TLanguage.Spanish]: 'Spanish',
  [TLanguage.Italian]: 'Italian',
  [TLanguage.Belarusian]: 'Belarusian',
  [TLanguage.Ukrainian]: 'Ukrainian',
  [TLanguage.Polish]: 'Polish',
};

export const LANGUAGE_FLAGS: Record<TLanguage, string> = {
  [TLanguage.English]: '🇬🇧',
  [TLanguage.German]: '🇩🇪',
  [TLanguage.Spanish]: '🇪🇸',
  [TLanguage.Italian]: '🇮🇹',
  [TLanguage.Belarusian]: '🇧🇾',
  [TLanguage.Ukrainian]: '🇺🇦',
  [TLanguage.Polish]: '🇵🇱',
};

export type TCharacter = {
  name: string;
  color: TColor;
};

export type TSubtitleLine = {
  line_no: number;
  start_time: number;
  end_time: number;
  input: string;
  output: string;
  character?: string;
  completed?: boolean;
};

export enum TWaveformStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
  UNSUPPORTED_VIDEO = 'unsupported_video',
  EXTRACTING_AUDIO = 'extracting_audio',
  AUDIO_EXTRACTION_FAILED = 'audio_extraction_failed',
  UNPLAYABLE_CONVERTED_AUDIO = 'unplayable_converted_audio',
}

export enum TMessageType {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  MESSAGE = 'MESSAGE',
}

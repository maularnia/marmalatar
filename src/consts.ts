import { TMessageType, TThemeSelection, TWaveformStatus } from '@src/types';
import { TUiLocale } from '@src/i18n/locales';
import { ThemeColors } from './theme/utils';
import { TColor } from './theme/definitions';
// Imports the bare i18next package (not '@src/i18n') deliberately -- that wrapper module itself
// imports UI_LOCALE_DEFAULT from this file, so importing it back here would create a circular
// module dependency. The bare package export is the exact same configured singleton at runtime,
// since '@src/i18n' calls `.init()` on it before the app renders anything.
import i18next from 'i18next';

const t = i18next.getFixedT(null, 'app');

export const AI_INTEGRATION_ENABLED_DEFAULT = false;
export const ASK_BEFORE_MERGE_DEFAULT = true;
export const ASK_BEFORE_DELETE_DEFAULT = true;
export const ASK_BEFORE_AI_TRANSLATE_DEFAULT = false;
export const ASK_BEFORE_SPLIT_DEFAULT = false;
export const AUTO_MERGE_THRESHOLD_DEFAULT = 300;
export const SCROLL_VIDEO_INTO_VIEW_ON_PLAY_DEFAULT = true;
export const AUTO_MARK_LINES_COMPLETED_DEFAULT = false;
export const TIME_ADJUSTMENT_STEP_DEFAULT = 100;
export const CHECK_GRAMMAR_DEFAULT = true;
export const THEME_SELECTION_DEFAULT: TThemeSelection = TThemeSelection.SYSTEM;
export const UI_LOCALE_DEFAULT: TUiLocale = 'en';

export const LARGE_SCREEN_THRESHOLD = 1650;
export const MEDUIM_SCREEN_THRESHOLD = 1440;

export const VideoFilesProcessingStatusToColor: { [key in TWaveformStatus]: TColor } = {
  [TWaveformStatus.IDLE]: ThemeColors.TEXT,
  [TWaveformStatus.LOADING]: ThemeColors.GOLD,
  [TWaveformStatus.SUCCESS]: ThemeColors.GREEN,
  [TWaveformStatus.ERROR]: ThemeColors.RED,
  [TWaveformStatus.UNSUPPORTED]: ThemeColors.RED,
};

// Getters, not plain values -- evaluated lazily at property-access (render) time rather than at
// module-load time, so the lookup always runs after '@src/i18n' has finished initializing,
// regardless of which module happens to import this one first.
export const VideoFileProcessingStatusToMessage: { [key in TWaveformStatus]: string } = {
  get [TWaveformStatus.IDLE]() {
    return t('videoFileStatus.idle');
  },
  get [TWaveformStatus.LOADING]() {
    return t('videoFileStatus.loading');
  },
  get [TWaveformStatus.SUCCESS]() {
    return t('videoFileStatus.success');
  },
  get [TWaveformStatus.ERROR]() {
    return t('videoFileStatus.error');
  },
  get [TWaveformStatus.UNSUPPORTED]() {
    return t('videoFileStatus.unsupported');
  },
};

export const MessageTypeToTimeout: { [key in TMessageType]: number } = {
  [TMessageType.ERROR]: Infinity,
  [TMessageType.WARNING]: 10_000,
  [TMessageType.MESSAGE]: 6_000,
};

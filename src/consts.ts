import { TMessageType, TThemeSelection } from '@src/types';
import { TUiLocale } from '@src/i18n/locales';

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

export const MessageTypeToTimeout: { [key in TMessageType]: number } = {
  [TMessageType.ERROR]: Infinity,
  [TMessageType.WARNING]: 10_000,
  [TMessageType.MESSAGE]: 6_000,
};

import { z } from 'zod';
import type { RootState } from '@store/root';
import { TThemeSelection } from '@src/types';
import { DEFAULT_AI_CLIENT_ID } from '@src/services/ai/config';
import { SUPPORTED_UI_LOCALES } from '@src/i18n/locales';
import { AppSettingsContractV1Schema } from '@bridge/definitions/appSettings';
import {
  AI_INTEGRATION_ENABLED_DEFAULT,
  ASK_BEFORE_AI_TRANSLATE_DEFAULT,
  ASK_BEFORE_DELETE_DEFAULT,
  ASK_BEFORE_MERGE_DEFAULT,
  ASK_BEFORE_SPLIT_DEFAULT,
  AUTO_MARK_LINES_COMPLETED_DEFAULT,
  AUTO_MERGE_THRESHOLD_DEFAULT,
  CHECK_GRAMMAR_DEFAULT,
  SCROLL_VIDEO_INTO_VIEW_ON_PLAY_DEFAULT,
  THEME_SELECTION_DEFAULT,
  TIME_ADJUSTMENT_STEP_DEFAULT,
  UI_LOCALE_DEFAULT,
} from '@src/consts';

const ThemeSelectionSchema = z.enum(TThemeSelection);
const UiLocaleSchema = z.enum(SUPPORTED_UI_LOCALES);

// Narrows the bridge's loose wire-shape contract (themeSelection/uiLocale as plain strings, no
// fallback defaults -- those are FE-only concerns) to this app's strict enums and defaults.
export const AppSettingsSchema = AppSettingsContractV1Schema.extend({
  selectedIntegrationId: z.string().nullable().catch(DEFAULT_AI_CLIENT_ID),
  AIintegrationEnabled: z.boolean().catch(AI_INTEGRATION_ENABLED_DEFAULT),
  askBeforeMerge: z.boolean().catch(ASK_BEFORE_MERGE_DEFAULT),
  askBeforeDelete: z.boolean().catch(ASK_BEFORE_DELETE_DEFAULT),
  askBeforeAITranslate: z.boolean().catch(ASK_BEFORE_AI_TRANSLATE_DEFAULT),
  askBeforeSplit: z.boolean().catch(ASK_BEFORE_SPLIT_DEFAULT),
  autoMergeThreshold: z.number().catch(AUTO_MERGE_THRESHOLD_DEFAULT),
  scrollVideoIntoViewOnPlay: z.boolean().catch(SCROLL_VIDEO_INTO_VIEW_ON_PLAY_DEFAULT),
  autoMarkLinesCompleted: z.boolean().catch(AUTO_MARK_LINES_COMPLETED_DEFAULT),
  timeAdjustmentStep: z.number().catch(TIME_ADJUSTMENT_STEP_DEFAULT),
  themeSelection: ThemeSelectionSchema.catch(THEME_SELECTION_DEFAULT),
  checkGrammar: z.boolean().catch(CHECK_GRAMMAR_DEFAULT),
  uiLocale: UiLocaleSchema.catch(UI_LOCALE_DEFAULT),
});

export type PersistedAppSettings = z.infer<typeof AppSettingsSchema>;

export function buildAppSettingsSaveData(state: RootState): PersistedAppSettings {
  const { app } = state;
  return AppSettingsSchema.parse({
    selectedIntegrationId: app.selectedIntegrationId,
    AIintegrationEnabled: app.AIintegrationEnabled,
    askBeforeMerge: app.askBeforeMerge,
    askBeforeDelete: app.askBeforeDelete,
    askBeforeAITranslate: app.askBeforeAITranslate,
    askBeforeSplit: app.askBeforeSplit,
    autoMergeThreshold: app.autoMergeThreshold,
    scrollVideoIntoViewOnPlay: app.scrollVideoIntoViewOnPlay,
    autoMarkLinesCompleted: app.autoMarkLinesCompleted,
    timeAdjustmentStep: app.timeAdjustmentStep,
    themeSelection: app.themeSelection,
    checkGrammar: app.checkGrammar,
    uiLocale: app.uiLocale,
  });
}

export function parseAppSettings(raw: unknown): PersistedAppSettings {
  return AppSettingsSchema.parse(raw && typeof raw === 'object' ? raw : {});
}

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { themes } from '@src/theme/themes';
import { TThemeSelection } from '@src/types';
import type { PersistedAppSettings } from '@utils/appSettingsFile';
import { DEFAULT_AI_CLIENT_ID } from '@src/services/ai/config';
import type { TUiLocale } from '@src/i18n/locales';
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
import { TScreenSize, TThemesMap } from '@src/theme/types';

type AppState = {
  resolvedThemeName: keyof TThemesMap;
  sceenSize: TScreenSize;
  selectedIntegrationId: string | null;
  AIintegrationEnabled: boolean;
  askBeforeMerge: boolean;
  askBeforeDelete: boolean;
  askBeforeAITranslate: boolean;
  askBeforeSplit: boolean;
  autoMergeThreshold: number;
  scrollVideoIntoViewOnPlay: boolean;
  autoMarkLinesCompleted: boolean;
  timeAdjustmentStep: number;
  themeSelection: TThemeSelection;
  checkGrammar: boolean;
  uiLocale: TUiLocale;
};

const initialState: AppState = {
  resolvedThemeName: 'light',
  sceenSize: TScreenSize.LARGE,
  selectedIntegrationId: DEFAULT_AI_CLIENT_ID,
  AIintegrationEnabled: AI_INTEGRATION_ENABLED_DEFAULT,
  askBeforeMerge: ASK_BEFORE_MERGE_DEFAULT,
  askBeforeDelete: ASK_BEFORE_DELETE_DEFAULT,
  askBeforeAITranslate: ASK_BEFORE_AI_TRANSLATE_DEFAULT,
  askBeforeSplit: ASK_BEFORE_SPLIT_DEFAULT,
  autoMergeThreshold: AUTO_MERGE_THRESHOLD_DEFAULT,
  scrollVideoIntoViewOnPlay: SCROLL_VIDEO_INTO_VIEW_ON_PLAY_DEFAULT,
  autoMarkLinesCompleted: AUTO_MARK_LINES_COMPLETED_DEFAULT,
  timeAdjustmentStep: TIME_ADJUSTMENT_STEP_DEFAULT,
  themeSelection: THEME_SELECTION_DEFAULT,
  checkGrammar: CHECK_GRAMMAR_DEFAULT,
  uiLocale: UI_LOCALE_DEFAULT,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setResolvedThemeName(state, action: PayloadAction<keyof TThemesMap>) {
      state.resolvedThemeName = action.payload;
    },
    setScreenSize(state, action: PayloadAction<TScreenSize>) {
      state.sceenSize = action.payload;
    },
    setSelectedIntegration(state, action: PayloadAction<string | null>) {
      state.selectedIntegrationId = action.payload;
    },
    setAIintegrationEnabled(state, action: PayloadAction<boolean>) {
      state.AIintegrationEnabled = action.payload;
    },
    setAskBeforeMerge(state, action: PayloadAction<boolean>) {
      state.askBeforeMerge = action.payload;
    },
    setAskBeforeDelete(state, action: PayloadAction<boolean>) {
      state.askBeforeDelete = action.payload;
    },
    setAskBeforeAITranslate(state, action: PayloadAction<boolean>) {
      state.askBeforeAITranslate = action.payload;
    },
    setAskBeforeSplit(state, action: PayloadAction<boolean>) {
      state.askBeforeSplit = action.payload;
    },
    setAutoMergeThreshold(state, action: PayloadAction<number>) {
      state.autoMergeThreshold = action.payload;
    },
    setScrollVideoIntoViewOnPlay(state, action: PayloadAction<boolean>) {
      state.scrollVideoIntoViewOnPlay = action.payload;
    },
    setAutoMarkLinesCompleted(state, action: PayloadAction<boolean>) {
      state.autoMarkLinesCompleted = action.payload;
    },
    setTimeAdjustmentStep(state, action: PayloadAction<number>) {
      state.timeAdjustmentStep = action.payload;
    },
    setThemeSelection(state, action: PayloadAction<TThemeSelection>) {
      state.themeSelection = action.payload;
    },
    setCheckGrammar(state, action: PayloadAction<boolean>) {
      state.checkGrammar = action.payload;
    },
    setUiLocale(state, action: PayloadAction<TUiLocale>) {
      state.uiLocale = action.payload;
    },
    hydrateAppSettings(state, action: PayloadAction<PersistedAppSettings>) {
      Object.assign(state, action.payload);
    },
  },
  selectors: {
    selectResolvedThemeName: (state) => state.resolvedThemeName,
    selectScreenSize: (state) => state.sceenSize,
    selectIsLargeScreen: (state) => state.sceenSize === TScreenSize.LARGE,
    selectIsSmallScreen: (state) => state.sceenSize === TScreenSize.SMALL,
    selectCurrentThemeData: (state) => themes[state.resolvedThemeName],
    selectSelectedIntegrationId: (state) => state.selectedIntegrationId,
    selectAIintegrationEnabled: (state) => state.AIintegrationEnabled,
    selectIntegrationIsConfigured: (state) =>
      state.selectedIntegrationId !== null && state.AIintegrationEnabled,
    selectAskBeforeMerge: (state) => state.askBeforeMerge,
    selectAskBeforeDelete: (state) => state.askBeforeDelete,
    selectAskBeforeAITranslate: (state) => state.askBeforeAITranslate,
    selectAskBeforeSplit: (state) => state.askBeforeSplit,
    selectAutoMergeThreshold: (state) => state.autoMergeThreshold,
    selectScrollVideoIntoViewOnPlay: (state) => state.scrollVideoIntoViewOnPlay,
    selectAutoMarkLinesCompleted: (state) => state.autoMarkLinesCompleted,
    selectTimeAdjustmentStep: (state) => state.timeAdjustmentStep,
    selectThemeSelection: (state) => state.themeSelection,
    selectCheckGrammar: (state) => state.checkGrammar,
    selectUiLocale: (state) => state.uiLocale,
  },
});

export const {
  setResolvedThemeName,
  setScreenSize,
  setSelectedIntegration,
  setAIintegrationEnabled,
  setAskBeforeMerge,
  setAskBeforeDelete,
  setAskBeforeAITranslate,
  setAskBeforeSplit,
  setAutoMergeThreshold,
  setScrollVideoIntoViewOnPlay,
  setAutoMarkLinesCompleted,
  setTimeAdjustmentStep,
  setThemeSelection,
  setCheckGrammar,
  setUiLocale,
  hydrateAppSettings,
} = appSlice.actions;

export default appSlice.reducer;

export const {
  selectResolvedThemeName,
  selectScreenSize,
  selectIsLargeScreen,
  selectIsSmallScreen,
  selectCurrentThemeData,
  selectSelectedIntegrationId,
  selectAIintegrationEnabled,
  selectIntegrationIsConfigured,
  selectAskBeforeMerge,
  selectAskBeforeDelete,
  selectAskBeforeAITranslate,
  selectAskBeforeSplit,
  selectAutoMergeThreshold,
  selectScrollVideoIntoViewOnPlay,
  selectAutoMarkLinesCompleted,
  selectTimeAdjustmentStep,
  selectThemeSelection,
  selectCheckGrammar,
  selectUiLocale,
} = appSlice.selectors;

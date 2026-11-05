import { createSlice, isAnyOf, PayloadAction } from '@reduxjs/toolkit';
import { promptTemplates } from '@src/services/prompt';
import type { PromptTemplateFileDataType } from '@src/utils/data/schemas';
import { glossaries } from '@src/services/glossary';
import { projects } from '@src/services/project';
import { workingFolder } from '@store/slices/workingFolder';
import { cancelActiveBulkJob } from './bulkJob';
import type { TranslationBulkJobState } from './connector/types';

// ── State ─────────────────────────────────────────────────────────────────────

type ContextWindowEstimate = { tokenCount: number; contextWindow: number };
type ContextWindowEstimateStatus = 'idle' | 'estimating' | 'success' | 'error';

type AiState = {
  selectedPromptTemplateData: PromptTemplateFileDataType | null;
  currentBulkJob: TranslationBulkJobState | null;
  isBusy: boolean;
  integrationConnected: boolean;
  integrationPingError: string | undefined;
  contextWindowEstimate: ContextWindowEstimate | null;
  contextWindowEstimateStatus: ContextWindowEstimateStatus;
};

const initialState: AiState = {
  selectedPromptTemplateData: null,
  currentBulkJob: null,
  isBusy: false,
  integrationConnected: false,
  integrationPingError: undefined,
  contextWindowEstimate: null,
  contextWindowEstimateStatus: 'idle',
};

// ── Slice ─────────────────────────────────────────────────────────────────────

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    setSelectedPromptTemplateData(state, action: PayloadAction<PromptTemplateFileDataType | null>) {
      state.selectedPromptTemplateData = action.payload;
      // The active template's content just changed (initial load, selection change, or a
      // refresh after save) -- any existing estimate no longer reflects it.
      state.contextWindowEstimateStatus = 'idle';
      state.contextWindowEstimate = null;
    },
    setCurrentBulkJob(state, action: PayloadAction<TranslationBulkJobState | null>) {
      state.currentBulkJob = action.payload;
    },
    setTranslationIsBusy(state, action: PayloadAction<boolean>) {
      state.isBusy = action.payload;
    },
    setIntegrationConnectionStatus(
      state,
      action: PayloadAction<{ connected: boolean; error?: string }>
    ) {
      state.integrationConnected = action.payload.connected;
      state.integrationPingError = action.payload.error;
    },
    setContextWindowEstimate(state, action: PayloadAction<ContextWindowEstimate | null>) {
      state.contextWindowEstimate = action.payload;
    },
    setContextWindowEstimateStatus(state, action: PayloadAction<ContextWindowEstimateStatus>) {
      state.contextWindowEstimateStatus = action.payload;
    },
  },
  extraReducers(builder) {
    builder.addMatcher(
      isAnyOf(workingFolder.folderChanged, promptTemplates.setSelectedFileName),
      (state) => {
        cancelActiveBulkJob();
        state.currentBulkJob = null;
        state.selectedPromptTemplateData = null;
      }
    );
    // The context-window estimate is only valid for the exact inputs it was computed from --
    // degrade it back to idle the moment any of them actually changes, rather than trying to
    // detect staleness later by recomputing and comparing a derived signature. Switching
    // integration and connection-status changes aren't listed here since they already force
    // `integrationConnected: false` first, which the read side already treats as "not ready".
    builder.addMatcher(
      isAnyOf(
        promptTemplates.setSelectedFileName,
        glossaries.setSelectedFileNames,
        glossaries.setResolvedEntries,
        projects.setSourceLanguage,
        projects.setTargetLanguage
      ),
      (state) => {
        state.contextWindowEstimateStatus = 'idle';
        state.contextWindowEstimate = null;
      }
    );
  },
  selectors: {
    selectCurrentBulkJob: (state) => state.currentBulkJob,
    selectTranslationIsBusy: (state) => state.isBusy,
    selectIntegrationConnected: (state) => state.integrationConnected,
    selectIntegrationPingError: (state) => state.integrationPingError,
    selectContextWindowEstimate: (state) => state.contextWindowEstimate,
    selectContextWindowEstimateStatus: (state) => state.contextWindowEstimateStatus,
    selectSelectedPromptTemplateData: (state) => state.selectedPromptTemplateData,
  },
});

export const {
  setSelectedPromptTemplateData,
  setCurrentBulkJob,
  setTranslationIsBusy,
  setIntegrationConnectionStatus,
  setContextWindowEstimate,
  setContextWindowEstimateStatus,
} = aiSlice.actions;

export const {
  selectCurrentBulkJob,
  selectTranslationIsBusy,
  selectIntegrationConnected,
  selectIntegrationPingError,
  selectContextWindowEstimate,
  selectContextWindowEstimateStatus,
  selectSelectedPromptTemplateData,
} = aiSlice.selectors;

export default aiSlice.reducer;

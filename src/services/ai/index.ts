import { Service } from '@src/services/Service';
import {
  applySelectedPromptTemplateFileName,
  cancelAutomatedBulkTranslation,
  estimateContextWindowUsage,
  initializeAiIntegration,
  startAutomatedBulkTranslation,
  startAutomatedTranslation,
  translateLine,
  translateUntranslatedLines,
} from './actions';
import {
  selectContextWindowEstimate,
  selectContextWindowEstimateStatus,
  selectCurrentBulkJob,
  selectIntegrationConnected,
  selectIntegrationPingError,
  selectSelectedPromptTemplateData,
  selectTranslationIsBusy,
  setContextWindowEstimate,
  setContextWindowEstimateStatus,
  setIntegrationConnectionStatus,
} from './slice';

// The ai service: the active AI integration and its connection, the selected prompt template's
// content, single-line and bulk translation jobs, and the context-window estimate. This file is
// its only entry point: the slice lives in slice.ts, the operations in actions.ts. The integrations
// themselves (DeepL, LM Studio, Ollama clients, their settings forms, batching) are in connector/.

export { default as aiReducer } from './slice';

// Keyed on "translation", so the facade reads ai.startAutomated, ai.selectIsBusy
export const ai = new Service('translation', {
  actions: {
    setContextWindowEstimate,
    setContextWindowEstimateStatus,
    setIntegrationConnectionStatus,
  },
  selectors: {
    selectContextWindowEstimate,
    selectContextWindowEstimateStatus,
    selectCurrentBulkJob,
    selectIntegrationConnected,
    selectIntegrationPingError,
    selectSelectedPromptTemplateData,
    selectTranslationIsBusy,
  },
  functions: {
    applySelectedPromptTemplateFileName,
    cancelAutomatedBulkTranslation,
    estimateContextWindowUsage,
    initializeAiIntegration,
    startAutomatedBulkTranslation,
    startAutomatedTranslation,
    translateLine,
    translateUntranslatedLines,
  },
});

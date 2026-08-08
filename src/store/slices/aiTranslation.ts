import { createSlice, isAnyOf, PayloadAction } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from '@store/root';
import type { PromptTemplateFileDataType } from '@src/utils/data/schemas';
import { aiClients } from '@src/services/ai/clients';
import { DEFAULT_AI_CLIENT_ID } from '@src/services/ai/config';
import type {
  AiClient,
  TranslationBulkJobState,
  TranslationRequestContext,
  ChunkTranslatedPayload,
  ChunkErrorPayload,
  ChunkStartPayload,
  TranslationProgressSnapshot,
  TranslationBatchResult,
  TranslationBatchController,
} from '@src/services/ai/types';
import { TranslationBatchStatus } from '@src/services/ai/types';
import { TSubtitleLine } from '@src/types';
import { LANGUAGE_LABELS } from '@src/types';
import { getErrorMessage } from '@src/utils/errors';
import i18n from '@src/i18n';
import {
  addFrozenLine,
  removeFrozenLine,
  selectSelectedPromptTemplateFileName,
  setFrozenLineNumbers,
  setSelectedGlossaryFileNames,
  setSelectedPromptTemplateFileName,
} from '@store/slices/prompt';
import { selectFolder, setFolder } from '@store/slices/disc';
import { selectSelectedIntegrationId, setSelectedIntegration } from '@store/slices/app';
import { addTranslatedLine, selectLines } from '@store/slices/editor';
import {
  selectResolvedGlossaryEntries,
  setResolvedGlossaryEntries,
} from '@store/slices/aiPromptEditor';
import { setProjectSourceLanguage, setProjectTargetLanguage } from '@store/slices/project';
import { readPromptTemplateFile } from '@src/utils/data/discIO';

// Only used within this slice (bulk-translate cancellation), so it lives here rather than in
// services/ai/clients.ts.
type ActiveController = TranslationBatchController<
  TranslationProgressSnapshot,
  TranslationBatchResult
>;
let activeController: ActiveController | null = null;

// The wired AiClient instance isn't serializable (it carries functions like `.ping`/`.translate`),
// so it can't live in Redux state -- it's tracked here as a plain module variable, alongside the
// serializable connection status (which does live in Redux, below).
let wiredClient: AiClient | null = null;

function getWiredAiClient(): AiClient | null {
  return wiredClient;
}

// Guards against out-of-order tokenize responses when estimateContextWindowUsage is triggered
// in quick succession (from both PromptSetupRow's own dependencies and each SettingsForm's
// debounced commit) -- a stale response is discarded rather than overwriting a newer one.
let estimateRequestId = 0;

// ── State ─────────────────────────────────────────────────────────────────────

type ContextWindowEstimate = { tokenCount: number; contextWindow: number };
type ContextWindowEstimateStatus = 'idle' | 'estimating' | 'success' | 'error';

type AiTranslationState = {
  selectedPromptTemplateData: PromptTemplateFileDataType | null;
  currentBulkJob: TranslationBulkJobState | null;
  isBusy: boolean;
  integrationConnected: boolean;
  integrationPingError: string | undefined;
  contextWindowEstimate: ContextWindowEstimate | null;
  contextWindowEstimateStatus: ContextWindowEstimateStatus;
};

const initialState: AiTranslationState = {
  selectedPromptTemplateData: null,
  currentBulkJob: null,
  isBusy: false,
  integrationConnected: false,
  integrationPingError: undefined,
  contextWindowEstimate: null,
  contextWindowEstimateStatus: 'idle',
};

// ── Slice ─────────────────────────────────────────────────────────────────────

const aiTranslationSlice = createSlice({
  name: 'aiTranslation',
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
    builder.addMatcher(isAnyOf(setFolder, setSelectedPromptTemplateFileName), (state) => {
      activeController?.cancel();
      activeController = null;
      state.currentBulkJob = null;
      state.selectedPromptTemplateData = null;
    });
    // The context-window estimate is only valid for the exact inputs it was computed from --
    // degrade it back to idle the moment any of them actually changes, rather than trying to
    // detect staleness later by recomputing and comparing a derived signature. Switching
    // integration and connection-status changes aren't listed here since they already force
    // `integrationConnected: false` first, which the read side already treats as "not ready".
    builder.addMatcher(
      isAnyOf(
        setSelectedPromptTemplateFileName,
        setSelectedGlossaryFileNames,
        setResolvedGlossaryEntries,
        setProjectSourceLanguage,
        setProjectTargetLanguage
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
  },
});

const { setSelectedPromptTemplateData, setCurrentBulkJob, setTranslationIsBusy } =
  aiTranslationSlice.actions;

export const {
  setIntegrationConnectionStatus,
  setContextWindowEstimate,
  setContextWindowEstimateStatus,
} = aiTranslationSlice.actions;

export const {
  selectCurrentBulkJob,
  selectTranslationIsBusy,
  selectIntegrationConnected,
  selectIntegrationPingError,
  selectContextWindowEstimate,
  selectContextWindowEstimateStatus,
} = aiTranslationSlice.selectors;

export default aiTranslationSlice.reducer;

// ── Helpers ───────────────────────────────────────────────────────────────────

const t = i18n.getFixedT(null, 'errors');

function requireAiClient() {
  const client = getWiredAiClient();
  if (!client) throw new Error(t('aiTranslation.noIntegrationConfigured'));
  return client;
}

// Shared between single-line and bulk translation -- both require a prompt template the same
// way, so both must surface the exact same error when one isn't selected. Skipped entirely for
// clients that don't support context (e.g. DeepL is a dedicated NMT model, not a general LLM, and
// never needs a system prompt to function) -- matches EditorAIActionsProvider's UI-level
// isPromptTemplateSelected() check, which reads client?.supportsContext the same way.
function requirePromptTemplateSelected(state: RootState): void {
  const client = getWiredAiClient();
  if (!client?.supportsContext) return;
  if (!selectSelectedPromptTemplateFileName(state)) {
    throw new Error(t('aiTranslation.noPromptTemplateSelected'));
  }
}

function buildContext(state: RootState): TranslationRequestContext {
  const { project, aiTranslation } = state;
  const { selectedPromptTemplateData } = aiTranslation;
  return {
    sourceLanguageCode: project.sourceLanguage ?? undefined,
    targetLanguageCode: project.targetLanguage ?? undefined,
    sourceLanguage: project.sourceLanguage ? LANGUAGE_LABELS[project.sourceLanguage] : undefined,
    targetLanguage: project.targetLanguage ? LANGUAGE_LABELS[project.targetLanguage] : undefined,
    glossaryEntries: selectResolvedGlossaryEntries(state),
    promptTemplate: selectedPromptTemplateData?.promptTemplate ?? undefined,
  };
}

// ── Thunks ────────────────────────────────────────────────────────────────────

// Reloads the actively-selected prompt template's cached content from disk -- used both when the
// selection itself changes (below) and when the active template is edited and saved elsewhere
// (see thunks.ts's savePromptTemplate), so it deliberately owns no isBusy side effects of its own;
// callers that need a loading indicator (like applySelectedPromptTemplateFileName) wrap it.
export const refreshSelectedPromptTemplateData =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = selectFolder(state);
    const fileName = selectSelectedPromptTemplateFileName(state);
    if (!folder || !fileName) {
      dispatch(setSelectedPromptTemplateData(null));
      return;
    }
    try {
      const data = await readPromptTemplateFile(fileName);
      dispatch(setSelectedPromptTemplateData(data));
    } catch {
      dispatch(setSelectedPromptTemplateData(null));
    }
  };

export const applySelectedPromptTemplateFileName =
  (fileName: string | null) =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(setTranslationIsBusy(true));
    dispatch(setSelectedPromptTemplateFileName(fileName));
    await dispatch(refreshSelectedPromptTemplateData());
    dispatch(setTranslationIsBusy(false));
  };

export const startAutomatedTranslation =
  (lineIndex: number) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();

    if (state.aiTranslation.isBusy) return;

    requirePromptTemplateSelected(state);

    const lines = selectLines(state);
    const line = lines[lineIndex];
    if (!line) return;
    if (state.prompt.frozenLineNumbers.includes(line.line_no)) return;

    const client = requireAiClient();
    const context = buildContext(state);

    dispatch(setTranslationIsBusy(true));
    dispatch(addFrozenLine(line.line_no));
    try {
      const translatedText = await client.translate({
        text: line.input,
        context: { ...context, lineNo: line.line_no },
      });
      dispatch(addTranslatedLine({ ...line, output: translatedText }));
    } catch (err) {
      dispatch(setIntegrationConnectionStatus({ connected: false, error: getErrorMessage(err) }));
      throw err;
    } finally {
      dispatch(removeFrozenLine(line.line_no));
      dispatch(setTranslationIsBusy(false));
    }
  };

export type BulkCallbackParams = {
  lines: TSubtitleLine[];
  onChunkTranslated?: (payload: ChunkTranslatedPayload) => void;
  onChunkError?: (payload: ChunkErrorPayload) => void;
  onChunkStart?: (payload: ChunkStartPayload) => void;
  onProgress?: (progress: TranslationProgressSnapshot) => void;
  onDone?: (result: TranslationBatchResult) => void;
};

export const startAutomatedBulkTranslation =
  (params: BulkCallbackParams) =>
  (dispatch: AppDispatch, getState: () => RootState): void => {
    const state = getState();

    requirePromptTemplateSelected(state);

    activeController?.cancel();
    activeController = null;
    dispatch(setCurrentBulkJob(null));
    dispatch(setTranslationIsBusy(true));

    const client = requireAiClient();
    const context = buildContext(state);
    const jobId = Date.now();

    const controller = client.bulkTranslate({
      lines: params.lines,
      context,
      onChunkStart: (payload) => {
        const cur = getState().aiTranslation.currentBulkJob;
        if (cur?.id === jobId) {
          dispatch(
            setCurrentBulkJob({
              ...cur,
              running: true,
              status: TranslationBatchStatus.RUNNING,
              currentLineNos: payload.lines.map((line) => line.line_no),
            })
          );
        }
        dispatch(setFrozenLineNumbers(payload.lines.map((line) => line.line_no)));
        params.onChunkStart?.(payload);
      },
      onProgress: (progress) => {
        const cur = getState().aiTranslation.currentBulkJob;
        if (cur?.id === jobId) {
          dispatch(
            setCurrentBulkJob({
              ...cur,
              running:
                progress.status === TranslationBatchStatus.RUNNING ||
                progress.status === TranslationBatchStatus.PAUSED,
              status: progress.status,
              total: progress.total,
              completed: progress.completed,
              failed: progress.failed,
            })
          );
        }
        params.onProgress?.(progress);
      },
      onDone: (result) => {
        dispatch(setCurrentBulkJob(null));
        dispatch(setTranslationIsBusy(false));
        dispatch(setFrozenLineNumbers([]));
        activeController = null;
        params.onDone?.(result);
      },
      onChunkTranslated: params.onChunkTranslated,
      onChunkError: (payload) => {
        dispatch(
          setIntegrationConnectionStatus({
            connected: false,
            error: getErrorMessage(payload.error),
          })
        );
        params.onChunkError?.(payload);
      },
    });

    activeController = controller;
    dispatch(
      setCurrentBulkJob({
        id: jobId,
        provider: client.id,
        running: true,
        status: TranslationBatchStatus.RUNNING,
        total: params.lines.length,
        completed: 0,
        failed: 0,
        currentLineNos: [],
      })
    );

    void controller.waitUntilFinished().catch(() => {
      dispatch(setCurrentBulkJob(null));
      dispatch(setTranslationIsBusy(false));
      dispatch(setFrozenLineNumbers([]));
      activeController = null;
    });
  };

export const cancelAutomatedBulkTranslation =
  () =>
  (dispatch: AppDispatch): void => {
    activeController?.cancel();
    activeController = null;
    dispatch(setCurrentBulkJob(null));
    dispatch(setTranslationIsBusy(false));
    dispatch(setFrozenLineNumbers([]));
  };

// Fire-and-forget: writes its result into Redux (contextWindowEstimate/contextWindowEstimateStatus)
// rather than returning a value, since it's now triggered from multiple independent places (each
// SettingsForm's own debounced commit, and PromptSetupRow's own dependencies) that don't
// share a caller to hand a return value back to.
export const estimateContextWindowUsage =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const requestId = ++estimateRequestId;
    const state = getState();
    const client = getWiredAiClient();

    if (!client?.evaluateContext || !selectSelectedPromptTemplateFileName(state)) {
      dispatch(setContextWindowEstimate(null));
      dispatch(setContextWindowEstimateStatus('idle'));
      return;
    }

    const lines = selectLines(state);
    if (!lines.length) {
      dispatch(setContextWindowEstimate(null));
      dispatch(setContextWindowEstimateStatus('idle'));
      return;
    }

    // Already have a valid estimate -- never green, we would never even be here (see the
    // per-field degrade-to-idle matcher above); this thunk is dispatched independently from four
    // places (PromptSetupRow's own effect, and each SettingsForm's commit effect, which also
    // fires on mount), so this guard has to live here to be authoritative regardless of which of
    // them triggered it.
    if (state.aiTranslation.contextWindowEstimateStatus === 'success') return;

    dispatch(setContextWindowEstimateStatus('estimating'));
    try {
      const result = await client.evaluateContext({
        lines,
        context: buildContext(state),
      });
      if (requestId !== estimateRequestId) return;
      dispatch(setContextWindowEstimate(result));
      dispatch(setContextWindowEstimateStatus(result ? 'success' : 'idle'));
    } catch (err) {
      if (requestId !== estimateRequestId) return;
      dispatch(setContextWindowEstimate(null));
      dispatch(setContextWindowEstimateStatus('error'));
      dispatch(setIntegrationConnectionStatus({ connected: false, error: getErrorMessage(err) }));
    }
  };

// The only path that changes which integration is active — never dispatch `setSelectedIntegration`
// directly from a component. Pass `integrationId` to switch providers; omit it to re-wire whatever
// is currently selected (mount). Pings using whatever settings the client already has cached or can
// load from persisted storage; if nothing's been configured yet, leaves connection status untouched
// since the client's own SettingsForm drives it once the user has entered valid settings.
export const initializeAiIntegration =
  (integrationId?: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const id = integrationId ?? selectSelectedIntegrationId(getState()) ?? DEFAULT_AI_CLIENT_ID;
    dispatch(setSelectedIntegration(id));
    dispatch(setIntegrationConnectionStatus({ connected: false, error: undefined }));

    const client = aiClients[id as keyof typeof aiClients] ?? null;
    wiredClient = client;
    if (!client) {
      dispatch(
        setIntegrationConnectionStatus({ connected: false, error: `Unknown AI client: ${id}` })
      );
      return;
    }

    if (!client.getCurrentSettings()) {
      await client.loadPersistedSettings();
    }
    if (!client.isConfigured()) return;

    try {
      const connected = await client.ping();
      dispatch(
        setIntegrationConnectionStatus({
          connected,
          error: connected ? undefined : `Could not connect to ${client.name}.`,
        })
      );
    } catch (error) {
      dispatch(setIntegrationConnectionStatus({ connected: false, error: getErrorMessage(error) }));
    }
  };

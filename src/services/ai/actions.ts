import { pushMessage } from '@providers/bridges/messages';
import i18n from '@src/i18n';
import {
  emitAiTranslationJobDoneMessage,
  emitAiTranslationJobFailedMessage,
  emitBulkTranslationFailedMessage,
  emitNoPromptTemplateMessage,
  emitTranslationCancelledMessage,
  emitUnableToTranslateLineMessage,
} from '@src/messages';
import { confirmTranslationOverride } from '@src/segments/dialogs/translationOverrride/translationOverrideConfirmation';
import { editor } from '@src/services/project';
import { promptTemplates } from '@src/services/prompt';
import { LANGUAGE_LABELS, TSubtitleLine } from '@src/types';
import { getErrorMessage } from '@src/utils/errors';
import { dispatch, select } from '@store/createApi';
import { glossaries } from '@src/services/glossary';
import { projects } from '@src/services/project';
import { settings } from '@store/slices/settings';
import { workingFolder } from '@store/slices/workingFolder';
import { cancelActiveBulkJob, setActiveBulkJobController } from './bulkJob';
import { aiClients } from './connector/clients';
import { DEFAULT_AI_CLIENT_ID } from './connector/config';
import {
  TranslationBatchStatus,
  type AiClient,
  type ChunkErrorPayload,
  type ChunkStartPayload,
  type ChunkTranslatedPayload,
  type TranslationBatchResult,
  type TranslationProgressSnapshot,
  type TranslationRequestContext,
} from './connector/types';
import {
  selectContextWindowEstimateStatus,
  selectCurrentBulkJob,
  selectSelectedPromptTemplateData,
  selectTranslationIsBusy,
  setContextWindowEstimate,
  setContextWindowEstimateStatus,
  setCurrentBulkJob,
  setIntegrationConnectionStatus,
  setSelectedPromptTemplateData,
  setTranslationIsBusy,
} from './slice';

// The ai service's operations. They read their own state with select(localSelector), not the
// facade: index.ts builds the facade from this file, so importing it here would be a cycle.

const t = i18n.getFixedT(null, 'errors');
const tDialogs = i18n.getFixedT(null, 'dialogs');

// The wired AiClient instance isn't serializable (it carries functions like `.ping`/`.translate`),
// so it can't live in Redux state -- it's tracked here as a plain module variable, alongside the
// serializable connection status (which does live in Redux).
let wiredClient: AiClient | null = null;

// Guards against out-of-order tokenize responses when estimateContextWindowUsage is triggered
// in quick succession (from both PromptSetupRow's own dependencies and each SettingsForm's
// debounced commit) -- a stale response is discarded rather than overwriting a newer one.
let estimateRequestId = 0;

// ── Helpers ───────────────────────────────────────────────────────────────────

function requireAiClient(): AiClient {
  if (!wiredClient) throw new Error(t('aiTranslation.noIntegrationConfigured'));
  return wiredClient;
}

// Shared between single-line and bulk translation -- both require a prompt template the same
// way, so both must surface the exact same error when one isn't selected. Skipped entirely for
// clients that don't support context (e.g. DeepL is a dedicated NMT model, not a general LLM, and
// never needs a system prompt to function) -- matches isPromptTemplateSelected() below, which
// reads client?.supportsContext the same way.
function requirePromptTemplateSelected(): void {
  if (!wiredClient?.supportsContext) return;
  if (!promptTemplates.get.selectedFileName()) {
    throw new Error(t('aiTranslation.noPromptTemplateSelected'));
  }
}

function buildContext(): TranslationRequestContext {
  const sourceLanguage = projects.get.sourceLanguage();
  const targetLanguage = projects.get.targetLanguage();
  return {
    sourceLanguageCode: sourceLanguage ?? undefined,
    targetLanguageCode: targetLanguage ?? undefined,
    sourceLanguage: sourceLanguage ? LANGUAGE_LABELS[sourceLanguage] : undefined,
    targetLanguage: targetLanguage ? LANGUAGE_LABELS[targetLanguage] : undefined,
    glossaryEntries: glossaries.get.resolvedEntries(),
    promptTemplate: select(selectSelectedPromptTemplateData)?.promptTemplate ?? undefined,
  };
}

// ── Integration ──────────────────────────────────────────────────────────────

// The only path that changes which integration is active — never dispatch `settings.setSelectedIntegration`
// directly from a component. Pass `integrationId` to switch providers; omit it to re-wire whatever
// is currently selected (mount). Pings using whatever settings the client already has cached or can
// load from persisted storage; if nothing's been configured yet, leaves connection status untouched
// since the client's own SettingsForm drives it once the user has entered valid settings.
export async function initializeAiIntegration(integrationId?: string): Promise<void> {
  const id = integrationId ?? settings.get.selectedIntegrationId() ?? DEFAULT_AI_CLIENT_ID;
  settings.setSelectedIntegration(id);
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
}

// ── Prompt template ──────────────────────────────────────────────────────────

// Reloads the actively-selected prompt template's cached content from disk -- used both when the
// selection itself changes (below) and when the active template is edited and saved elsewhere
// (see thunks.ts's savePromptTemplate), so it deliberately owns no isBusy side effects of its own;
// callers that need a loading indicator (like applySelectedPromptTemplateFileName) wrap it.
export async function refreshSelectedPromptTemplateData(): Promise<void> {
  const folder = workingFolder.get.folder();
  const fileName = promptTemplates.get.selectedFileName();
  if (!folder || !fileName) {
    dispatch(setSelectedPromptTemplateData(null));
    return;
  }
  try {
    dispatch(setSelectedPromptTemplateData(await promptTemplates.readFile(fileName)));
  } catch {
    dispatch(setSelectedPromptTemplateData(null));
  }
}

export async function applySelectedPromptTemplateFileName(fileName: string | null): Promise<void> {
  dispatch(setTranslationIsBusy(true));
  promptTemplates.setSelectedFileName(fileName);
  await refreshSelectedPromptTemplateData();
  dispatch(setTranslationIsBusy(false));
}

// ── Context window ───────────────────────────────────────────────────────────

// Fire-and-forget: writes its result into Redux (contextWindowEstimate/contextWindowEstimateStatus)
// rather than returning a value, since it's triggered from multiple independent places (each
// SettingsForm's own debounced commit, and PromptSetupRow's own dependencies) that don't share a
// caller to hand a return value back to.
export async function estimateContextWindowUsage(): Promise<void> {
  const requestId = ++estimateRequestId;
  const client = wiredClient;

  if (!client?.evaluateContext || !promptTemplates.get.selectedFileName()) {
    dispatch(setContextWindowEstimate(null));
    dispatch(setContextWindowEstimateStatus('idle'));
    return;
  }

  const lines = editor.get.lines();
  if (!lines.length) {
    dispatch(setContextWindowEstimate(null));
    dispatch(setContextWindowEstimateStatus('idle'));
    return;
  }

  // Already have a valid estimate -- never green, we would never even be here (see the slice's
  // per-field degrade-to-idle matcher); this is called independently from four places
  // (PromptSetupRow's own effect, and each SettingsForm's commit effect, which also fires on
  // mount), so this guard has to live here to be authoritative regardless of which of them
  // triggered it.
  if (select(selectContextWindowEstimateStatus) === 'success') return;

  dispatch(setContextWindowEstimateStatus('estimating'));
  try {
    const result = await client.evaluateContext({ lines, context: buildContext() });
    if (requestId !== estimateRequestId) return;
    dispatch(setContextWindowEstimate(result));
    dispatch(setContextWindowEstimateStatus(result ? 'success' : 'idle'));
  } catch (err) {
    if (requestId !== estimateRequestId) return;
    dispatch(setContextWindowEstimate(null));
    dispatch(setContextWindowEstimateStatus('error'));
    dispatch(setIntegrationConnectionStatus({ connected: false, error: getErrorMessage(err) }));
  }
}

// ── Translation jobs ─────────────────────────────────────────────────────────

// These throw on a missing setup; translateLine and translateUntranslatedLines below are the
// user-facing wrappers that report through toasts instead.

export async function startAutomatedTranslation(lineIndex: number): Promise<void> {
  if (select(selectTranslationIsBusy)) return;

  requirePromptTemplateSelected();

  const line = editor.get.lines()[lineIndex];
  if (!line) return;
  if (editor.get.frozenLineNumbers().includes(line.line_no)) return;

  const client = requireAiClient();
  const context = buildContext();

  dispatch(setTranslationIsBusy(true));
  editor.addFrozenLine(line.line_no);
  try {
    const translatedText = await client.translate({
      text: line.input,
      context: { ...context, lineNo: line.line_no },
    });
    editor.addTranslatedLine({ ...line, output: translatedText });
  } catch (err) {
    dispatch(setIntegrationConnectionStatus({ connected: false, error: getErrorMessage(err) }));
    throw err;
  } finally {
    editor.removeFrozenLine(line.line_no);
    dispatch(setTranslationIsBusy(false));
  }
}

type BulkCallbackParams = {
  lines: TSubtitleLine[];
  onChunkTranslated?: (payload: ChunkTranslatedPayload) => void;
  onChunkError?: (payload: ChunkErrorPayload) => void;
  onChunkStart?: (payload: ChunkStartPayload) => void;
  onProgress?: (progress: TranslationProgressSnapshot) => void;
  onDone?: (result: TranslationBatchResult) => void;
};

function endBulkJob(): void {
  dispatch(setCurrentBulkJob(null));
  dispatch(setTranslationIsBusy(false));
  editor.setFrozenLineNumbers([]);
  setActiveBulkJobController(null);
}

export function startAutomatedBulkTranslation(params: BulkCallbackParams): void {
  requirePromptTemplateSelected();

  cancelActiveBulkJob();
  dispatch(setCurrentBulkJob(null));
  dispatch(setTranslationIsBusy(true));

  const client = requireAiClient();
  const context = buildContext();
  const jobId = Date.now();

  const controller = client.bulkTranslate({
    lines: params.lines,
    context,
    onChunkStart: (payload) => {
      const cur = select(selectCurrentBulkJob);
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
      editor.setFrozenLineNumbers(payload.lines.map((line) => line.line_no));
      params.onChunkStart?.(payload);
    },
    onProgress: (progress) => {
      const cur = select(selectCurrentBulkJob);
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
      endBulkJob();
      params.onDone?.(result);
    },
    onChunkTranslated: params.onChunkTranslated,
    onChunkError: (payload) => {
      dispatch(
        setIntegrationConnectionStatus({ connected: false, error: getErrorMessage(payload.error) })
      );
      params.onChunkError?.(payload);
    },
  });

  setActiveBulkJobController(controller);
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

  void controller.waitUntilFinished().catch(endBulkJob);
}

export function cancelAutomatedBulkTranslation(): void {
  cancelActiveBulkJob();
  dispatch(setCurrentBulkJob(null));
  dispatch(setTranslationIsBusy(false));
  editor.setFrozenLineNumbers([]);
}

// ── User-facing operations ───────────────────────────────────────────────────

// Check the setup, ask before overwriting, and report through toasts, where the jobs above throw.

function isPromptTemplateSelected(): boolean {
  const selectedIntegrationId = settings.get.selectedIntegrationId();
  const client = selectedIntegrationId
    ? aiClients[selectedIntegrationId as keyof typeof aiClients]
    : undefined;
  if (client?.supportsContext && !promptTemplates.get.selectedFileName()) {
    emitNoPromptTemplateMessage(pushMessage);
    return false;
  }
  return true;
}

/** Translates one line, asking first when it already has a translation (or when settings say to
 * always ask). */
export async function translateLine(lineIndex: number): Promise<void> {
  if (!isPromptTemplateSelected()) return;

  const line = editor.get.lines()[lineIndex];
  const outputNotEmpty = Boolean(line?.output?.trim());
  if (outputNotEmpty || settings.get.askBeforeAITranslate()) {
    let confirmed: boolean;
    try {
      confirmed = await confirmTranslationOverride({
        text: outputNotEmpty
          ? tDialogs('translationOverride.bodyHasContent')
          : tDialogs('translationOverride.bodyWillTranslate'),
      });
    } catch {
      emitUnableToTranslateLineMessage(pushMessage);
      return;
    }
    if (!confirmed) {
      emitTranslationCancelledMessage(pushMessage);
      return;
    }
  }

  try {
    await startAutomatedTranslation(lineIndex);
    emitAiTranslationJobDoneMessage(pushMessage);
  } catch (err) {
    emitAiTranslationJobFailedMessage(
      pushMessage,
      err instanceof Error
        ? err.message
        : 'Unexpected critical error while performing AI translation'
    );
  }
}

/** Translates every line without a translation in one bulk job, writing each chunk's results as
 * they arrive. */
export function translateUntranslatedLines(): void {
  if (!settings.get.selectedIntegrationId()) return;
  if (!isPromptTemplateSelected()) return;
  const translationLines = editor.get.lines();
  const autoMarkLinesCompleted = settings.get.autoMarkLinesCompleted();
  const lines = translationLines.filter((line) => !line.output);
  if (!lines.length) return;
  try {
    startAutomatedBulkTranslation({
      lines,
      onChunkTranslated: ({ results }) => {
        results.forEach(({ line, translatedText }) => {
          const lineIndex = translationLines.indexOf(line);
          if (lineIndex < 0) return;
          editor.updateTranslatedText({ lineIndex, text: translatedText });
          if (autoMarkLinesCompleted)
            editor.setLineCompleted({
              lineIndex,
              completed: Boolean(translatedText),
              skipHistory: true,
            });
        });
      },
      onChunkError: ({ error }) => {
        emitBulkTranslationFailedMessage(pushMessage, error.message);
      },
    });
  } catch (err) {
    emitBulkTranslationFailedMessage(
      pushMessage,
      err instanceof Error ? err.message : 'How did you get here? [UNREACHABLE 02]'
    );
  }
}

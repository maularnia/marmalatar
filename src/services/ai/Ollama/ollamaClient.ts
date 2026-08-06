import { AiClient, TranslationRequestContext } from '@src/services/ai/types';
import { TSubtitleLine } from '@src/types';
import i18n from '@src/i18n';
import { resolveBatchSize, selectRepresentativeLines } from '@src/services/ai/batchingUtils';
import {
  pingOllamaEndpoint,
  tokenizeWithOllama,
  translateBatchWithOllama,
  translateWithOllama,
} from './translateWithOllama';
import {
  buildOllamaChatEndpoint,
  buildOllamaPingEndpoint,
  DEFAULT_OLLAMA_CONTEXT_LENGTH,
} from './consts';
import OllamaSettingsForm from './OllamaSettingsForm';

export type OllamaSettingKey = 'endpoint' | 'model' | 'context_length' | 'lines_per_request';

export const endpointSettingKey: OllamaSettingKey = 'endpoint';
export const modelSettingKey: OllamaSettingKey = 'model';
export const contextLengthSettingKey: OllamaSettingKey = 'context_length';
export const linesPerRequestSettingKey: OllamaSettingKey = 'lines_per_request';

const t = i18n.getFixedT(null, 'errors');

function resolveContextLength(settings: Record<OllamaSettingKey, string>): number {
  const value = settings[contextLengthSettingKey] || DEFAULT_OLLAMA_CONTEXT_LENGTH;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? parseInt(DEFAULT_OLLAMA_CONTEXT_LENGTH, 10) : parsed;
}

class OllamaClient extends AiClient<OllamaSettingKey> {
  readonly id = 'ollama';
  readonly name = 'Ollama';
  readonly supportsContext = true;
  readonly SettingsForm = OllamaSettingsForm;

  async ping(): Promise<boolean> {
    return this.guardBackendCall(async () => {
      const settings = this.requireCurrentSettings();
      return pingOllamaEndpoint({
        endpoint: buildOllamaPingEndpoint(settings[endpointSettingKey]),
      });
    });
  }

  async translate({
    text,
    context,
  }: {
    text: string;
    context?: TranslationRequestContext;
  }): Promise<string> {
    return this.guardBackendCall(async () => {
      const settings = this.requireCurrentSettings();
      const model = settings[modelSettingKey] ?? '';
      if (!model.trim()) {
        throw new Error(t('ollama.modelRequired'));
      }
      const lineNo = context?.lineNo ?? 0;
      const results = await translateWithOllama({
        endpoint: buildOllamaChatEndpoint(settings[endpointSettingKey]),
        model,
        lines: [{ line: lineNo, text }],
        context,
        contextLength: resolveContextLength(settings),
      });
      const match = results.find((result) => result.line === lineNo);
      if (!match) {
        throw new Error(t('ollama.noTranslationReturned'));
      }
      return match.text;
    });
  }

  bulkTranslate({
    lines,
    context,
    onDone,
    onChunkError,
    onChunkStart,
    onChunkTranslated,
    onProgress,
  }: Parameters<AiClient<OllamaSettingKey>['bulkTranslate']>[0]) {
    const settings = this.requireCurrentSettings();
    const model = settings[modelSettingKey] ?? '';
    if (!model.trim()) {
      throw new Error(t('ollama.modelRequired'));
    }
    return translateBatchWithOllama({
      endpoint: buildOllamaChatEndpoint(settings[endpointSettingKey]),
      model,
      lines,
      context,
      contextLength: resolveContextLength(settings),
      chunkSize: resolveBatchSize(settings[linesPerRequestSettingKey], lines.length),
      onDone,
      onChunkError: (payload) => {
        this.cachedOptions = null;
        onChunkError?.(payload);
      },
      onChunkStart,
      onChunkTranslated,
      onProgress,
    });
  }

  async evaluateContext({
    lines,
    context,
  }: {
    lines: TSubtitleLine[];
    context?: TranslationRequestContext;
  }): Promise<{ tokenCount: number; contextWindow: number }> {
    return this.guardBackendCall(async () => {
      const settings = this.requireCurrentSettings();
      const model = settings[modelSettingKey] ?? '';
      if (!model.trim()) {
        throw new Error(t('ollama.modelRequired'));
      }
      const batchSize = resolveBatchSize(settings[linesPerRequestSettingKey], lines.length);
      const representativeLines = selectRepresentativeLines(lines, batchSize);
      const tokenCount = await tokenizeWithOllama({
        endpoint: buildOllamaChatEndpoint(settings[endpointSettingKey]),
        model,
        lines: representativeLines.map((line) => ({ line: line.line_no, text: line.input })),
        context,
      });
      return { tokenCount, contextWindow: resolveContextLength(settings) };
    });
  }
}

export const ollamaClient = new OllamaClient();

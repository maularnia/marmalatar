import { AiClient, TranslationRequestContext } from '@src/services/ai/types';
import { TSubtitleLine } from '@src/types';
import i18n from '@src/i18n';
import { resolveBatchSize, selectRepresentativeLines } from '@src/services/ai/batchingUtils';
import {
  pingLMStudioEndpoint,
  tokenizeWithLMStudio,
  translateBatchWithLMStudio,
  translateWithLMStudio,
} from './translateWithLMStudio';
import { DEFAULT_LMSTUDIO_CONTEXT_LENGTH } from './consts';
import LMStudioSettingsForm from './LMStudioSettingsForm';

export type LMStudioSettingKey =
  | 'endpoint'
  | 'model'
  | 'context_length'
  | 'reasoning_start_tag'
  | 'reasoning_end_tag'
  | 'lines_per_request';

export const endpointSettingKey: LMStudioSettingKey = 'endpoint';
export const modelSettingKey: LMStudioSettingKey = 'model';
export const contextLengthSettingKey: LMStudioSettingKey = 'context_length';
export const reasoningStartTagSettingKey: LMStudioSettingKey = 'reasoning_start_tag';
export const reasoningEndTagSettingKey: LMStudioSettingKey = 'reasoning_end_tag';
export const linesPerRequestSettingKey: LMStudioSettingKey = 'lines_per_request';

const t = i18n.getFixedT(null, 'errors');

function resolveContextLength(settings: Record<LMStudioSettingKey, string>): number {
  const value = settings[contextLengthSettingKey] || DEFAULT_LMSTUDIO_CONTEXT_LENGTH;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? parseInt(DEFAULT_LMSTUDIO_CONTEXT_LENGTH, 10) : parsed;
}

function resolveReasoningTags(settings: Record<LMStudioSettingKey, string>): {
  reasoningStartTag?: string;
  reasoningEndTag?: string;
} {
  const reasoningStartTag = settings[reasoningStartTagSettingKey] || undefined;
  const reasoningEndTag = settings[reasoningEndTagSettingKey] || undefined;
  return reasoningStartTag && reasoningEndTag ? { reasoningStartTag, reasoningEndTag } : {};
}

class LMStudioClient extends AiClient<LMStudioSettingKey> {
  readonly id = 'lmstudio';
  readonly name = 'LM Studio';
  readonly supportsContext = true;
  readonly SettingsForm = LMStudioSettingsForm;

  async ping(): Promise<boolean> {
    return this.guardBackendCall(async () => {
      const settings = this.requireCurrentSettings();
      return pingLMStudioEndpoint({ host: settings[endpointSettingKey] });
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
        throw new Error(t('lmStudio.modelRequired'));
      }
      const lineNo = context?.lineNo ?? 0;
      const results = await translateWithLMStudio({
        host: settings[endpointSettingKey],
        model,
        lines: [{ line: lineNo, text }],
        context,
        contextLength: resolveContextLength(settings),
        ...resolveReasoningTags(settings),
      });
      const match = results.find((result) => result.line === lineNo);
      if (!match) {
        throw new Error(t('lmStudio.noTranslationReturned'));
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
  }: Parameters<AiClient<LMStudioSettingKey>['bulkTranslate']>[0]) {
    const settings = this.requireCurrentSettings();
    const model = settings[modelSettingKey] ?? '';
    if (!model.trim()) {
      throw new Error(t('lmStudio.modelRequired'));
    }
    return translateBatchWithLMStudio({
      host: settings[endpointSettingKey],
      model,
      lines,
      context,
      contextLength: resolveContextLength(settings),
      ...resolveReasoningTags(settings),
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
        throw new Error(t('lmStudio.modelRequired'));
      }
      const batchSize = resolveBatchSize(settings[linesPerRequestSettingKey], lines.length);
      const representativeLines = selectRepresentativeLines(lines, batchSize);
      const tokenCount = await tokenizeWithLMStudio({
        host: settings[endpointSettingKey],
        model,
        lines: representativeLines.map((line) => ({ line: line.line_no, text: line.input })),
        context,
      });
      return { tokenCount, contextWindow: resolveContextLength(settings) };
    });
  }
}

export const lmStudioClient = new LMStudioClient();

import { AiClient, TranslationRequestContext } from '@src/services/ai/connector/types';
import { TSubtitleLine } from '@src/types';
import i18n from '@src/i18n';
import {
  resolveBatchSize,
  selectRepresentativeLines,
} from '@src/services/ai/connector/batchingUtils';
import {
  pingLMStudioEndpoint,
  tokenizeWithLMStudio,
  translateBatchWithLMStudio,
  translateWithLMStudio,
} from './translateWithLMStudio';
import {
  contextLengthSettingKey,
  DEFAULT_LMSTUDIO_CONTEXT_LENGTH,
  endpointSettingKey,
  linesPerRequestSettingKey,
  LMSTUDIO_CLIENT_ID,
  modelSettingKey,
  reasoningEndTagSettingKey,
  reasoningStartTagSettingKey,
  type LMStudioSettingKey,
} from './consts';

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
  readonly id = LMSTUDIO_CLIENT_ID;
  readonly name = 'LM Studio';
  readonly supportsContext = true;

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

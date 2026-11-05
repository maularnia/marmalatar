import { TSubtitleLine } from '@src/types';
import {
  TranslationBatchController,
  TranslationBatchResult,
  TranslationProgressSnapshot,
  TranslationRequestContext,
} from '@src/services/ai/connector/types';
import {
  buildLMStudioPlainTextInstructions,
  buildLMStudioSystemPrompt,
} from './lmStudioContextUtils';
import { resolvePromptTemplate } from '@src/services/ai/connector/context';
import { AgentJob } from '@src/services/ai/connector/agentJob';
import { BATCH_TRANSLATION_JSON_SCHEMA } from '@src/services/ai/connector/config';
import {
  buildStructuredBatchInstructions,
  buildStructuredBatchUserMessage,
} from '@src/services/ai/connector/batchingUtils';
import {
  LMStudioModelOption,
  LMStudioOutputLine,
  LMStudioPingParams,
  LMStudioTokenizeParams,
  LMStudioTranslateBulkParams,
  LMStudioTranslationParams,
} from './types';
import { IPC } from '@src/services/ipc/IPC';

function buildLMStudioFullSystemPrompt(
  context: TranslationRequestContext | undefined,
  isStructured: boolean
): string {
  const system = context?.promptTemplate
    ? resolvePromptTemplate(context.promptTemplate, {
        sourceLanguage: context.sourceLanguage ?? '',
        targetLanguage: context.targetLanguage ?? '',
        glossaryEntries: context.glossaryEntries ?? [],
      })
    : buildLMStudioSystemPrompt(context);

  return [
    system,
    isStructured ? buildStructuredBatchInstructions() : buildLMStudioPlainTextInstructions(),
  ].join('\n\n');
}

export async function pingLMStudioEndpoint({ host }: LMStudioPingParams): Promise<boolean> {
  return IPC.lmStudio.ping(host);
}

export async function listLMStudioModels({
  host,
}: LMStudioPingParams): Promise<LMStudioModelOption[]> {
  return IPC.lmStudio.listModels(host);
}

export async function translateWithLMStudio({
  host,
  model,
  lines,
  context,
  contextLength,
  reasoningStartTag,
  reasoningEndTag,
  signal,
}: LMStudioTranslationParams): Promise<LMStudioOutputLine[]> {
  const requestId = crypto.randomUUID();
  signal?.addEventListener('abort', () => {
    void IPC.lmStudio.cancel(requestId);
  });

  return IPC.lmStudio.translate({
    requestId,
    host,
    model,
    lines,
    systemPrompt: buildLMStudioFullSystemPrompt(context, lines.length > 1),
    contextLength,
    reasoningStartTag,
    reasoningEndTag,
    jsonSchema: BATCH_TRANSLATION_JSON_SCHEMA,
  });
}

export async function tokenizeWithLMStudio({
  host,
  model,
  lines,
  context,
}: LMStudioTokenizeParams): Promise<number> {
  const isStructured = lines.length > 1;
  const userContent = isStructured ? buildStructuredBatchUserMessage(lines) : lines[0].text;
  const fullPromptText = [buildLMStudioFullSystemPrompt(context, isStructured), userContent].join(
    '\n\n'
  );
  return IPC.lmStudio.tokenize({ host, model, text: fullPromptText });
}

export function translateBatchWithLMStudio({
  host,
  model,
  lines,
  context,
  contextLength,
  reasoningStartTag,
  reasoningEndTag,
  chunkSize,
  onChunkTranslated,
  onChunkError,
  onChunkStart,
  onProgress,
  onDone,
}: LMStudioTranslateBulkParams): TranslationBatchController<
  TranslationProgressSnapshot,
  TranslationBatchResult<TSubtitleLine>
> {
  return new AgentJob({
    lines,
    chunkSize,
    onChunkTranslated,
    onChunkError,
    onChunkStart,
    onProgress,
    onDone,
    runChunk: (chunkLines, _chunkIndex, signal) =>
      translateWithLMStudio({
        host,
        model,
        lines: chunkLines.map((line) => ({ line: line.line_no, text: line.input })),
        context,
        contextLength,
        reasoningStartTag,
        reasoningEndTag,
        signal,
      }),
  });
}

import { TSubtitleLine } from '@src/types';
import i18n from '@src/i18n';
import {
  HttpStatusError,
  TranslationBatchController,
  TranslationBatchResult,
  TranslationProgressSnapshot,
  TranslationRequestContext,
} from '@src/services/ai/types';
import { buildOllamaPlainTextInstructions, buildOllamaSystemPrompt } from './ollamaContextUtils';
import { resolvePromptTemplate } from '@src/services/ai/context';
import { AgentJob } from '@src/services/ai/agentJob';
import { BATCH_TRANSLATION_JSON_SCHEMA } from '@src/services/ai/config';
import {
  buildStructuredBatchInstructions,
  buildStructuredBatchUserMessage,
  computeStructuredMaxTokens,
  parseStructuredBatchResponse,
} from '@src/services/ai/batchingUtils';
import {
  OllamaChatResponse,
  OllamaModelOption,
  OllamaOutputLine,
  OllamaPingParams,
  OllamaTagsResponse,
  OllamaTokenizeParams,
  OllamaTranslateBulkParams,
  OllamaTranslationParams,
} from './types';

const t = i18n.getFixedT(null, 'errors');

function buildOllamaFullSystemPrompt(
  context: TranslationRequestContext | undefined,
  isStructured: boolean
): string {
  const system = context?.promptTemplate
    ? resolvePromptTemplate(context.promptTemplate, {
        sourceLanguage: context.sourceLanguage ?? '',
        targetLanguage: context.targetLanguage ?? '',
        glossaryEntries: context.glossaryEntries ?? [],
      })
    : buildOllamaSystemPrompt(context);

  return [
    system,
    isStructured ? buildStructuredBatchInstructions() : buildOllamaPlainTextInstructions(),
  ].join('\n\n');
}

export async function pingOllamaEndpoint({ endpoint, signal }: OllamaPingParams): Promise<boolean> {
  const response = await fetch(endpoint, {
    method: 'GET',
    signal,
  });
  if (!response.ok) {
    throw new HttpStatusError(response.status, t('ollama.pingFailed', { status: response.status }));
  }
  return true;
}

export async function listOllamaModels({
  endpoint,
  signal,
}: OllamaPingParams): Promise<OllamaModelOption[]> {
  return await fetch(endpoint, {
    method: 'GET',
    signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(t('ollama.modelsRequestFailed', { status: response.status }));
      }
      const payload = (await response.json()) as OllamaTagsResponse;
      const modelNames = (payload.models ?? [])
        .map((item) => (item.name ?? item.model ?? '').trim())
        .filter(Boolean);
      const uniqueNames = Array.from(new Set(modelNames));
      if (!modelNames.length) {
        throw new Error(t('ollama.noModelsFound'));
      }
      return uniqueNames.map((name) => ({ value: name, label: name }));
    })
    .catch(() => {
      throw new Error(t('ollama.backendDown'));
    });
}

export async function translateWithOllama({
  endpoint,
  model,
  lines,
  context,
  contextLength,
  signal,
}: OllamaTranslationParams): Promise<OllamaOutputLine[]> {
  const isStructured = lines.length > 1;

  const requestBody = {
    model,
    stream: false,
    messages: [
      { role: 'system', content: buildOllamaFullSystemPrompt(context, isStructured) },
      {
        role: 'user',
        content: isStructured ? buildStructuredBatchUserMessage(lines) : lines[0].text,
      },
    ],
    options: {
      repeat_penalty: 1.3,
      ...(contextLength ? { num_ctx: contextLength } : {}),
      ...(isStructured
        ? { num_predict: computeStructuredMaxTokens(lines.length, contextLength) }
        : {}),
    },
    ...(isStructured ? { format: BATCH_TRANSLATION_JSON_SCHEMA } : {}),
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    throw new Error(t('ollama.requestFailed', { status: response.status }));
  }

  const payload = (await response.json()) as OllamaChatResponse;
  const rawContent = payload.message?.content ?? '';

  if (!isStructured) {
    return [{ line: lines[0].line, text: rawContent.trim() }];
  }

  const translations = parseStructuredBatchResponse(rawContent);
  return Array.from(translations, ([line, text]) => ({ line, text }));
}

export async function tokenizeWithOllama({
  endpoint,
  model,
  lines,
  context,
  signal,
}: OllamaTokenizeParams): Promise<number> {
  const isStructured = lines.length > 1;
  const requestBody = {
    model,
    stream: false,
    messages: [
      { role: 'system', content: buildOllamaFullSystemPrompt(context, isStructured) },
      {
        role: 'user',
        content: isStructured ? buildStructuredBatchUserMessage(lines) : lines[0].text,
      },
    ],
    options: {
      num_predict: 1,
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    throw new Error(t('ollama.requestFailed', { status: response.status }));
  }

  const payload = (await response.json()) as OllamaChatResponse;
  return payload.prompt_eval_count ?? 0;
}

export function translateBatchWithOllama({
  endpoint,
  model,
  lines,
  context,
  contextLength,
  chunkSize,
  onChunkTranslated,
  onChunkError,
  onChunkStart,
  onProgress,
  onDone,
}: OllamaTranslateBulkParams): TranslationBatchController<
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
      translateWithOllama({
        endpoint,
        model,
        lines: chunkLines.map((line) => ({ line: line.line_no, text: line.input })),
        context,
        contextLength,
        signal,
      }),
  });
}

import { TSubtitleLine } from '@src/types';
import {
  TranslationBatchController,
  TranslationBatchResult,
  TranslationProgressSnapshot,
} from '@src/services/ai/types';
import { AgentJob } from '@src/services/ai/agentJob';
import {
  DeepLGlossaryOption,
  DeepLOutputLine,
  DeepLTranslateBulkParams,
  DeepLTranslationParams,
} from './types';

export async function pingDeepL(apiKey: string): Promise<boolean> {
  return window.electronAPI.deeplPing(apiKey);
}

export async function listDeepLGlossaries(apiKey: string): Promise<DeepLGlossaryOption[]> {
  return window.electronAPI.deeplListGlossaries(apiKey);
}

export async function translateWithDeepL({
  apiKey,
  sourceLang,
  targetLang,
  lines,
  formality,
  modelType,
  glossaryId,
}: DeepLTranslationParams): Promise<DeepLOutputLine[]> {
  return window.electronAPI.deeplTranslate({
    apiKey,
    sourceLang,
    targetLang,
    lines,
    formality,
    modelType,
    glossaryId,
  });
}

export function translateBatchWithDeepL({
  apiKey,
  sourceLang,
  targetLang,
  lines,
  formality,
  modelType,
  glossaryId,
  chunkSize,
  onChunkTranslated,
  onChunkError,
  onChunkStart,
  onProgress,
  onDone,
}: DeepLTranslateBulkParams): TranslationBatchController<
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
    runChunk: (chunkLines) =>
      translateWithDeepL({
        apiKey,
        sourceLang,
        targetLang,
        lines: chunkLines.map((line) => ({ line: line.line_no, text: line.input })),
        formality,
        modelType,
        glossaryId,
      }),
  });
}

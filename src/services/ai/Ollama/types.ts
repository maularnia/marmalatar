import { TSubtitleLine } from '@src/types';
import {
  TranslationBatchCallbacks,
  TranslationBatchResult,
  TranslationProgressSnapshot,
  TranslationRequestContext,
} from '@src/services/ai/types';

type OllamaInputLine = {
  line: number;
  text: string;
};

export type OllamaOutputLine = {
  line: number;
  text: string;
};

export type OllamaTranslationParams = {
  endpoint: string;
  model: string;
  lines: OllamaInputLine[];
  context?: TranslationRequestContext;
  contextLength?: number;
  signal?: AbortSignal;
};

export type OllamaPingParams = {
  endpoint: string;
  signal?: AbortSignal;
};

export type OllamaModelOption = {
  value: string;
  label: string;
};

export type OllamaTranslateBulkParams = {
  endpoint: string;
  model: string;
  lines: TSubtitleLine[];
  context?: TranslationRequestContext;
  contextLength?: number;
  chunkSize: number;
} & TranslationBatchCallbacks<
  TSubtitleLine,
  TranslationProgressSnapshot,
  TranslationBatchResult<TSubtitleLine>
>;

export type OllamaChatResponse = {
  message?: {
    role?: string;
    content?: string;
  };
  prompt_eval_count?: number;
};

export type OllamaTokenizeParams = {
  endpoint: string;
  model: string;
  lines: OllamaInputLine[];
  context?: TranslationRequestContext;
  signal?: AbortSignal;
};

export type OllamaTagsResponse = {
  models?: Array<{
    name?: string;
    model?: string;
  }>;
};

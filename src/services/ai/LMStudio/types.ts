import { TSubtitleLine } from '@src/types';
import {
  TranslationBatchCallbacks,
  TranslationBatchResult,
  TranslationProgressSnapshot,
  TranslationRequestContext,
} from '@src/services/ai/types';

type LMStudioInputLine = {
  line: number;
  text: string;
};

export type LMStudioOutputLine = {
  line: number;
  text: string;
};

export type LMStudioModelOption = {
  value: string;
  label: string;
};

export type LMStudioPingParams = {
  host: string;
};

export type LMStudioTranslationParams = {
  host: string;
  model: string;
  lines: LMStudioInputLine[];
  context?: TranslationRequestContext;
  contextLength?: number;
  reasoningStartTag?: string;
  reasoningEndTag?: string;
  signal?: AbortSignal;
};

export type LMStudioTranslateBulkParams = {
  host: string;
  model: string;
  lines: TSubtitleLine[];
  context?: TranslationRequestContext;
  contextLength?: number;
  reasoningStartTag?: string;
  reasoningEndTag?: string;
  chunkSize: number;
} & TranslationBatchCallbacks<
  TSubtitleLine,
  TranslationProgressSnapshot,
  TranslationBatchResult<TSubtitleLine>
>;

export type LMStudioTokenizeParams = {
  host: string;
  model: string;
  lines: LMStudioInputLine[];
  context?: TranslationRequestContext;
};

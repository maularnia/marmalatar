import { TSubtitleLine } from '@src/types';
import {
  TranslationBatchCallbacks,
  TranslationBatchResult,
  TranslationProgressSnapshot,
} from '@src/services/ai/types';

type DeepLInputLine = {
  line: number;
  text: string;
};

export type DeepLOutputLine = {
  line: number;
  text: string;
};

export type DeepLGlossaryOption = {
  value: string;
  label: string;
};

export type DeepLTranslationParams = {
  apiKey: string;
  sourceLang: string;
  targetLang: string;
  lines: DeepLInputLine[];
  formality?: string;
  modelType: string;
  glossaryId?: string;
};

export type DeepLTranslateBulkParams = {
  apiKey: string;
  sourceLang: string;
  targetLang: string;
  lines: TSubtitleLine[];
  formality?: string;
  modelType: string;
  glossaryId?: string;
  chunkSize: number;
} & TranslationBatchCallbacks<
  TSubtitleLine,
  TranslationProgressSnapshot,
  TranslationBatchResult<TSubtitleLine>
>;

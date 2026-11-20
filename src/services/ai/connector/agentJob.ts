import { TSubtitleLine } from '@src/types';
import {
  ChunkErrorPayload,
  ChunkLineResult,
  ChunkStartPayload,
  ChunkTranslatedPayload,
  TranslationBatchController,
  TranslationBatchResult,
  TranslationBatchStatus,
  TranslationProgressSnapshot,
} from './types';

type AgentJobParams = {
  lines: TSubtitleLine[];
  chunkSize: number;
  runChunk: (
    lines: TSubtitleLine[],
    chunkIndex: number,
    signal: AbortSignal
  ) => Promise<Array<{ line: number; text: string }>>;
  onChunkStart?: (payload: ChunkStartPayload<TSubtitleLine>) => void;
  onChunkTranslated?: (payload: ChunkTranslatedPayload<TSubtitleLine>) => void;
  onChunkError?: (payload: ChunkErrorPayload<TSubtitleLine>) => void;
  onProgress?: (progress: TranslationProgressSnapshot) => void;
  onDone?: (result: TranslationBatchResult<TSubtitleLine>) => void;
};

export class AgentJob implements TranslationBatchController<
  TranslationProgressSnapshot,
  TranslationBatchResult<TSubtitleLine>
> {
  private readonly lines: TSubtitleLine[];
  private readonly chunkSize: number;
  private readonly runChunk: AgentJobParams['runChunk'];
  private readonly onChunkStart: AgentJobParams['onChunkStart'];
  private readonly onChunkTranslated: AgentJobParams['onChunkTranslated'];
  private readonly onChunkError: AgentJobParams['onChunkError'];
  private readonly onProgress: AgentJobParams['onProgress'];
  private readonly onDone: AgentJobParams['onDone'];

  private paused = false;
  private cancelled = false;
  private status: TranslationBatchStatus = TranslationBatchStatus.RUNNING;
  private currentAbortController: AbortController | null = null;
  private pauseResolver: (() => void) | null = null;
  private readonly translatedLines: TSubtitleLine[] = [];
  private completed = 0;
  private failed = 0;
  private readonly runner: Promise<TranslationBatchResult<TSubtitleLine>>;

  constructor({
    lines,
    chunkSize,
    runChunk,
    onChunkStart,
    onChunkTranslated,
    onChunkError,
    onProgress,
    onDone,
  }: AgentJobParams) {
    this.lines = lines;
    this.chunkSize = Math.max(1, chunkSize);
    this.runChunk = runChunk;
    this.onChunkStart = onChunkStart;
    this.onChunkTranslated = onChunkTranslated;
    this.onChunkError = onChunkError;
    this.onProgress = onProgress;
    this.onDone = onDone;
    this.runner = this.execute();
  }

  private snapshot(): TranslationProgressSnapshot {
    return {
      total: this.lines.length,
      completed: this.completed,
      failed: this.failed,
      status: this.status,
    };
  }

  private emitProgress(): void {
    this.onProgress?.(this.snapshot());
  }

  private async waitWhilePaused(): Promise<void> {
    while (this.paused && !this.cancelled) {
      await new Promise<void>((resolve) => {
        this.pauseResolver = resolve;
      });
    }
  }

  private finish(
    result: TranslationBatchResult<TSubtitleLine>
  ): TranslationBatchResult<TSubtitleLine> {
    this.onDone?.(result);
    return result;
  }

  private async execute(): Promise<TranslationBatchResult<TSubtitleLine>> {
    this.emitProgress();

    for (let start = 0; start < this.lines.length; start += this.chunkSize) {
      if (this.cancelled) break;
      await this.waitWhilePaused();
      if (this.cancelled) break;

      const chunk = this.lines.slice(start, start + this.chunkSize);
      const chunkIndex = start / this.chunkSize;
      this.onChunkStart?.({ lines: chunk, chunkIndex });
      this.currentAbortController = new AbortController();

      try {
        const output = await this.runChunk(chunk, chunkIndex, this.currentAbortController.signal);
        const textByLineNo = new Map(output.map((item) => [item.line, item.text]));
        const results: ChunkLineResult<TSubtitleLine>[] = chunk.map((line) => {
          const translatedText = textByLineNo.get(line.line_no) ?? '';
          this.translatedLines.push({ ...line, output: translatedText });
          if (translatedText) {
            this.completed += 1;
          } else {
            this.failed += 1;
          }
          return { line, translatedText };
        });
        this.onChunkTranslated?.({ lines: chunk, results });
      } catch (rawError: unknown) {
        const error = rawError instanceof Error ? rawError : new Error('Translation failed');
        if (this.cancelled) break;
        this.failed += chunk.length;
        this.onChunkError?.({ lines: chunk, error });

        // Never continue past a failure -- stop the batch immediately.
        this.status = TranslationBatchStatus.CANCELLED;
        this.emitProgress();
        return this.finish({
          translatedLines: this.translatedLines,
          completed: this.completed,
          failed: this.failed,
          cancelled: true,
        });
      } finally {
        this.currentAbortController = null;
        this.emitProgress();
      }
    }

    this.status = this.cancelled
      ? TranslationBatchStatus.CANCELLED
      : TranslationBatchStatus.COMPLETED;
    this.emitProgress();
    return this.finish({
      translatedLines: this.translatedLines,
      completed: this.completed,
      failed: this.failed,
      cancelled: this.cancelled,
    });
  }

  pause(): void {
    if (this.cancelled || this.status === TranslationBatchStatus.COMPLETED || this.paused) return;
    this.paused = true;
    this.status = TranslationBatchStatus.PAUSED;
    this.emitProgress();
  }

  resume(): void {
    if (this.cancelled || this.status === TranslationBatchStatus.COMPLETED || !this.paused) return;
    this.paused = false;
    this.status = TranslationBatchStatus.RUNNING;
    this.emitProgress();
    const resolver = this.pauseResolver;
    this.pauseResolver = null;
    resolver?.();
  }

  cancel(): void {
    if (this.cancelled || this.status === TranslationBatchStatus.COMPLETED) return;
    this.cancelled = true;
    this.paused = false;
    this.status = TranslationBatchStatus.CANCELLED;
    const resolver = this.pauseResolver;
    this.pauseResolver = null;
    resolver?.();
    this.currentAbortController?.abort();
    this.emitProgress();
  }

  getProgress(): TranslationProgressSnapshot {
    return this.snapshot();
  }

  waitUntilFinished(): Promise<TranslationBatchResult<TSubtitleLine>> {
    return this.runner;
  }
}

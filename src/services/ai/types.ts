import { TLanguage, TSubtitleLine } from '@src/types';
import i18n from '@src/i18n';
import type { ComponentType } from 'react';
import type { RegisterOptions } from 'react-hook-form';
import type { TOptionSelect } from '@ui-toolkit/Select/Select';

const t = i18n.getFixedT(null, 'errors');

// ── Batch status & progress ────────────────────────────────────────────────

export enum TranslationBatchStatus {
  RUNNING = 'running',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export type TranslationProgressSnapshot = {
  total: number;
  completed: number;
  failed: number;
  status: TranslationBatchStatus;
};

// ── Batch event payloads ───────────────────────────────────────────────────

export type ChunkLineResult<TLine = TSubtitleLine> = {
  line: TLine;
  translatedText: string;
};

export type ChunkStartPayload<TLine = TSubtitleLine> = {
  lines: TLine[];
  chunkIndex: number;
};

export type ChunkTranslatedPayload<TLine = TSubtitleLine> = {
  lines: TLine[];
  results: ChunkLineResult<TLine>[];
};

export type ChunkErrorPayload<TLine = TSubtitleLine> = {
  lines: TLine[];
  error: Error;
};

// ── Batch result & controller ──────────────────────────────────────────────

export type TranslationBatchResult<TLine = TSubtitleLine> = {
  translatedLines: TLine[];
  completed: number;
  failed: number;
  cancelled: boolean;
};

export type TranslationBatchController<
  TProgress extends TranslationProgressSnapshot = TranslationProgressSnapshot,
  TResult extends TranslationBatchResult = TranslationBatchResult,
> = {
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  getProgress: () => TProgress;
  waitUntilFinished: () => Promise<TResult>;
};

export type TranslationBatchCallbacks<
  TLine = TSubtitleLine,
  TProgress extends TranslationProgressSnapshot = TranslationProgressSnapshot,
  TResult extends TranslationBatchResult<TLine> = TranslationBatchResult<TLine>,
> = {
  onChunkStart?: (payload: ChunkStartPayload<TLine>) => void;
  onChunkTranslated?: (payload: ChunkTranslatedPayload<TLine>) => void;
  onChunkError?: (payload: ChunkErrorPayload<TLine>) => void;
  onProgress?: (progress: TProgress) => void;
  onDone?: (result: TResult) => void;
};

// ── Translation request context ────────────────────────────────────────────

export type TranslationRequestContext = {
  sourceLanguageCode?: TLanguage;
  targetLanguageCode?: TLanguage;
  /** Human-readable source language name */
  sourceLanguage?: string;
  /** Human-readable target language name */
  targetLanguage?: string;
  glossaryEntries?: Array<[string, string]>;
  extraInstructions?: string;
  /** Template with {SOURCE_LANGUAGE}, {TARGET_LANGUAGE}, {GLOSSARY_TABLE} placeholders (the latter resolves to a CSV block, not a markdown table) */
  promptTemplate?: string;
  /** Line number of the line being translated — used by the single-line translate() path */
  lineNo?: number;
};

// ── Bulk job state ─────────────────────────────────────────────────────────

export type TranslationBulkJobState = {
  id: number;
  provider: string;
  running: boolean;
  status: TranslationBatchStatus;
  total: number;
  completed: number;
  failed: number;
  currentLineNos: number[];
};

// ── AI client settings form ────────────────────────────────────────────────

export type AiClientSettingsFormProps = {
  onSettingsValidChange: (isValid: boolean) => void;
};

// Generic across every integration's SettingsForm (Ollama/LMStudio/DeepL) -- the connect/ping
// flow always resolves to one of these four states, driving the same status Message everywhere.
// The corresponding value maps (ConnectionStatusToColor/ConnectionStatusToMessage) live in
// ./config.ts alongside the rest of this folder's constants, not here.
export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

// ── Errors ──────────────────────────────────────────────────────────────────

/** Thrown by ping/etc. when the server responded but with a non-ok HTTP status. */
export class HttpStatusError extends Error {
  constructor(
    public readonly status: number,
    message?: string
  ) {
    super(message ?? `Request failed with status ${status}`);
    this.name = 'HttpStatusError';
  }
}

// ── AI client contract ──────────────────────────────────────────────────────

export abstract class AiClient<TSettingKey extends string = string> {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly supportsContext: boolean;
  /**
   * Owns its own layout, validation, and settings persistence (via the electron bridge, keyed
   * by `id`). The app only ever learns whether this form is currently valid, via
   * `onSettingsValidChange` — it never sees settings values.
   */
  abstract readonly SettingsForm: ComponentType<AiClientSettingsFormProps>;

  protected currentSettings: Record<TSettingKey, string> | null = null;

  /**
   * Internal accessor to the client's current settings — for use by this client's own module
   * (its `SettingsForm`, `ping`/`translate`/`bulkTranslate`/`tokenize`) only. TypeScript has no
   * "same-module" visibility modifier, so this can't be `protected` (a sibling `SettingsForm`
   * component isn't a subclass and couldn't call it), but it is deliberately kept out of the
   * app-facing data flow by convention: nothing outside `src/services/ai/**` should ever call it.
   */
  getCurrentSettings(): Record<TSettingKey, string> | null {
    return this.currentSettings;
  }

  /** @internal — see `getCurrentSettings`. */
  requireCurrentSettings(): Record<TSettingKey, string> {
    const settings = this.currentSettings;
    if (!settings) throw new Error(t('ai.notConfigured', { name: this.name }));
    return settings;
  }

  /**
   * Called by the client's own SettingsForm on every valid change: updates the in-memory cache
   * and persists directly via the electron bridge, keyed by `this.id`.
   */
  setCurrentSettings(settings: Record<TSettingKey, string>): void {
    this.currentSettings = settings;
    void window.electronAPI.setIntegrationSettings(this.id, settings);
  }

  /**
   * Hydrates the cache from persisted storage. Called once by the boot-time thunk, and by the
   * SettingsForm on mount if nothing is cached yet for this session. Only ever assigns when
   * something was actually found on disk -- this may resolve after the SettingsForm's own commit
   * effect has already populated `currentSettings` (e.g. with just-typed-in defaults), and a bare
   * "nothing persisted" result must not clobber that back to null.
   */
  async loadPersistedSettings(): Promise<Record<TSettingKey, string> | null> {
    const stored = (await window.electronAPI.getIntegrationSettings(this.id)) as Record<
      TSettingKey,
      string
    > | null;
    if (stored) this.currentSettings = stored;
    return this.currentSettings;
  }

  /** Whether the client is ready to ping/translate — i.e. has ever-committed settings. */
  isConfigured(): boolean {
    return this.currentSettings !== null;
  }

  protected cachedOptions: TOptionSelect[] | null = null;

  /**
   * Last successfully fetched model/glossary list for this client's SettingsForm, or null if
   * never fetched this session (or invalidated by a failed request). Null vs [] matters — e.g.
   * DeepL's glossary list can legitimately be empty on a successful fetch. Lets the SettingsForm
   * stay stale across remounts (reuse the cached list) instead of re-pinging just because it
   * remounted.
   */
  getCachedOptions(): TOptionSelect[] | null {
    return this.cachedOptions;
  }

  setCachedOptions(options: TOptionSelect[] | null): void {
    this.cachedOptions = options;
  }

  /**
   * Wraps a single outgoing backend call (ping/translate/evaluateContext): on failure, invalidates
   * the cached model/glossary list, since a request failing is exactly the signal that whatever
   * was last fetched can no longer be trusted. Centralized here so every subclass's request
   * methods self-manage this instead of every call site (thunks, settings forms) needing to.
   */
  protected async guardBackendCall<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      this.cachedOptions = null;
      throw err;
    }
  }

  abstract ping(): Promise<boolean>;

  abstract translate(params: {
    text: string;
    context?: TranslationRequestContext;
  }): Promise<string>;

  abstract bulkTranslate(
    params: {
      lines: TSubtitleLine[];
      context?: TranslationRequestContext;
    } & TranslationBatchCallbacks<
      TSubtitleLine,
      TranslationProgressSnapshot,
      TranslationBatchResult
    >
  ): TranslationBatchController<TranslationProgressSnapshot, TranslationBatchResult<TSubtitleLine>>;

  /**
   * Evaluates how many tokens a real request would consume, given the full set of lines a bulk
   * job would translate. The client owns the estimate end-to-end: it reads its own current
   * settings (e.g. lines-per-request/batch size) to decide how many lines a representative
   * request would actually bundle together, builds that prompt internally (system prompt included,
   * matching whatever shape `translate`/`bulkTranslate` would really send), and measures it —
   * the caller only ever hands over raw lines and translation context, never a pre-built prompt.
   * Optional — declared as an optional property (not `abstract`) so a client can genuinely omit
   * it (e.g. DeepL has no token-window concept). Note: TypeScript's `abstract foo?()` syntax still
   * forces every subclass to implement it despite the `?`, so this must stay a property-typed
   * function signature, not an abstract method, for real optionality. Gate calls on whether
   * `client.evaluateContext` is truthy.
   */
  evaluateContext?(params: {
    lines: TSubtitleLine[];
    context?: TranslationRequestContext;
  }): Promise<{ tokenCount: number; contextWindow: number }>;
}

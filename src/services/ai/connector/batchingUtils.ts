import i18n from '@src/i18n';
import { DEFAULT_LINES_PER_REQUEST, LINES_PER_REQUEST_ALL_VALUE } from './config';

const t = i18n.getFixedT(null, 'errors');

// ── Lines-per-request (batch size) helpers ───────────────────────────────────

// 'all' resolves against the actual job size; other values are clamped to it so a batch size
// larger than the job itself never over-allocates.
export function resolveBatchSize(settingValue: string | undefined, totalLineCount: number): number {
  if (totalLineCount <= 0) return 1;
  if (settingValue === LINES_PER_REQUEST_ALL_VALUE) return totalLineCount;
  const parsed = parseInt(settingValue || DEFAULT_LINES_PER_REQUEST, 10);
  const value = Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
  return Math.min(value, totalLineCount);
}

// Picks a representative sample for context-window evaluation, mirroring how a real bulk
// translate request would actually be formed (see EditorControls.tsx's `!line.output` filter):
// the first `count` untranslated (empty-output) lines, in order, since that's the first real
// chunk a bulk job would send. If nothing is untranslated (e.g. everything's already translated),
// falls back to the first `count` lines overall so an estimate is still possible.
export function selectRepresentativeLines<T extends { output: string }>(
  lines: T[],
  count: number
): T[] {
  const untranslated = lines.filter((line) => !line.output);
  return (untranslated.length ? untranslated : lines).slice(0, count);
}

// ── Structured (JSON-schema) batch translation helpers ───────────────────────
// The schema itself lives in ./config (BATCH_TRANSLATION_JSON_SCHEMA); these are the
// prompt-building/response-parsing helpers used alongside it by both Ollama and LM Studio's
// renderer-side request builders once lines_per_request > 1.

export function buildStructuredBatchUserMessage(
  lines: Array<{ line: number; text: string }>
): string {
  return lines.map(({ line, text }) => `[${line}] ${text}`).join('\n');
}

export function buildStructuredBatchInstructions(): string {
  return [
    'You will receive multiple subtitle lines, each prefixed with its line number in brackets, e.g. "[3] Hello".',
    'Translate each line independently.',
    'Respond with a JSON object matching the required schema: one entry per input line, with the exact same line number, in any order.',
    'Do not merge, skip, split, or reorder lines. Do not include any text outside the JSON object.',
  ].join(' ');
}

// Throws a clear Error rather than returning partial/guessed data -- a thrown error here
// propagates through AgentJob's runChunk and aborts the whole batch, which is the desired
// behavior when a model/server doesn't actually honor structured output.
export function parseStructuredBatchResponse(raw: string): Map<number, string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(t('batching.invalidJson'));
  }
  const translations = (parsed as { translations?: unknown } | null)?.translations;
  if (!Array.isArray(translations)) {
    throw new Error(t('batching.missingTranslationsArray'));
  }
  const map = new Map<number, string>();
  for (const item of translations) {
    if (
      item &&
      typeof item === 'object' &&
      typeof (item as { line?: unknown }).line === 'number' &&
      typeof (item as { text?: unknown }).text === 'string'
    ) {
      map.set((item as { line: number }).line, (item as { text: string }).text.trim());
    }
  }
  return map;
}

// A tunable starting point, not a scientifically derived constant -- gives structured/grammar-
// constrained generation enough headroom to avoid getting cut off mid-JSON, per LM Studio SDK's
// own doc recommendation to always set a maxTokens cap alongside `structured`.
export function computeStructuredMaxTokens(lineCount: number, contextLength?: number): number {
  const estimate = 64 + lineCount * 120;
  if (!contextLength) return estimate;
  return Math.min(estimate, Math.floor(contextLength / 2));
}

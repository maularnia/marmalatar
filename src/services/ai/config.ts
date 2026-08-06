// Consolidated constants for the src/services/ai/ root (provider-specific constants stay in
// each provider's own consts.ts, e.g. Ollama/consts.ts, LMStudio/consts.ts).
import { TOptionSelect } from '@ui-toolkit/Select/Select';
import { ThemeColors } from '@src/theme/utils';
import type { TColor } from '@src/theme/definitions';
import type { ConnectionStatus } from './types';

// ── Default AI client ────────────────────────────────────────────────────────

// Intentionally a literal, not `ollamaClient.id` -- ollamaClient.ts imports its own
// OllamaSettingsForm, which imports constants from this file, so importing ollamaClient here
// would create a circular dependency (and a "Cannot access before initialization" crash at
// runtime). Must match OllamaClient.id in ./Ollama/ollamaClient.ts.
export const DEFAULT_AI_CLIENT_ID = 'ollama';

// ── Prompt templates ──────────────────────────────────────────────────────────

export const DEFAULT_PROMPT_TEMPLATE = `# Role
You are a subtitle translator.
Do not add explanations, notes, or quotes.
# Languages
You are translating from {SOURCE_LANGUAGE}
You are translating to {TARGET_LANGUAGE}
## Glossaries
This is user provided suggestions for translation of certain words and phrases, use them where applicable (CSV format):
{GLOSSARY_TABLE}`;

// ── Lines-per-request (batch size) settings ──────────────────────────────────

export const LINES_PER_REQUEST_ALL_VALUE = 'all';

export function getLinesPerRequestOptions(t: (key: string) => string): TOptionSelect[] {
  return [
    { value: '1', label: t('aiSettings.common.linesPerRequestOptions.recommended') },
    { value: '5', label: '5' },
    { value: '10', label: '10' },
    { value: '25', label: '25' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
    {
      value: LINES_PER_REQUEST_ALL_VALUE,
      label: t('aiSettings.common.linesPerRequestOptions.all'),
    },
  ];
}

export const DEFAULT_LINES_PER_REQUEST = '1';

// ── Structured (JSON-schema) batch translation contract ──────────────────────
// Not duplicated for the main-process (LM Studio IPC) path -- it's a plain, IPC-serializable
// object, so the renderer sends it along as part of the translate request instead (see
// LMStudioTranslationParams.jsonSchema in bridge/lmStudio.ts).

export const BATCH_TRANSLATION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    translations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          line: { type: 'integer' },
          text: { type: 'string' },
        },
        required: ['line', 'text'],
      },
    },
  },
  required: ['translations'],
};

// ── Connection status display (Ollama/LMStudio/DeepL SettingsForm) ───────────
// ConnectionStatus itself is a type, so it stays in ./types.ts -- these are values.

export const ConnectionStatusToColor: Record<ConnectionStatus, TColor> = {
  connected: ThemeColors.GREEN,
  connecting: ThemeColors.TEXT,
  error: ThemeColors.RED,
  idle: ThemeColors.TEXT,
};

export const ConnectionStatusMessageKey: Record<ConnectionStatus, string> = {
  connected: 'aiSettings.common.connectionStatus.connected',
  connecting: 'aiSettings.common.connectionStatus.connecting',
  error: 'aiSettings.common.connectionStatus.error',
  idle: 'aiSettings.common.connectionStatus.idle',
};

// The user-facing/validated default — always a real absolute URL, since it's now an editable
// setting that gets parsed with `new URL()`. The dev-mode Vite proxy rewrite (see
// `resolveOllamaFetchBase`) is an internal fetch-time detail, not something users configure.
export const DEFAULT_OLLAMA_ENDPOINT = 'http://127.0.0.1:11434';

// Maps the (always-absolute) configured base to the dev-mode proxy path when it's still the
// default — `vite.renderer.config.ts` rewrites `/ollama` to `http://127.0.0.1:11434` in dev to
// dodge CORS. A custom/non-default endpoint is used as-is (no proxy available for it).
function resolveOllamaFetchBase(base: string): string {
  return import.meta.env.DEV && base === DEFAULT_OLLAMA_ENDPOINT ? '/ollama' : base;
}

export function buildOllamaChatEndpoint(base: string): string {
  return `${resolveOllamaFetchBase(base)}/api/chat`;
}

export function buildOllamaPingEndpoint(base: string): string {
  return `${resolveOllamaFetchBase(base)}/api/tags`;
}

export const OLLAMA_CONTEXT_LENGTH_OPTIONS = [
  { value: '4096', label: '4k' },
  { value: '8192', label: '8k' },
  { value: '16384', label: '16k' },
  { value: '32768', label: '32k' },
  { value: '65536', label: '64k' },
  { value: '131072', label: '128k' },
  { value: '262144', label: '256k' },
];

export const DEFAULT_OLLAMA_CONTEXT_LENGTH = OLLAMA_CONTEXT_LENGTH_OPTIONS[0].value;

export const DEFAULT_LMSTUDIO_HOST = 'ws://127.0.0.1:1234';

export const LMSTUDIO_CONTEXT_LENGTH_OPTIONS = [
  { value: '4096', label: '4096 (4k)' },
  { value: '8192', label: '8192 (8k)' },
  { value: '16384', label: '16384 (16k)' },
  { value: '32768', label: '32768 (32k)' },
  { value: '65536', label: '65536 (64k)' },
  { value: '131072', label: '131072 (128k)' },
  { value: '262144', label: '262144 (256k)' },
];

export const DEFAULT_LMSTUDIO_CONTEXT_LENGTH = LMSTUDIO_CONTEXT_LENGTH_OPTIONS[0].value;

// Most reasoning-capable models (DeepSeek-R1 distills, QwQ, Qwen3 thinking mode, ...) wrap their
// chain-of-thought in these tags. Models using a different scheme (e.g. Harmony-style channels)
// need these overridden in settings.
export const DEFAULT_LMSTUDIO_REASONING_START_TAG = '<think>';
export const DEFAULT_LMSTUDIO_REASONING_END_TAG = '</think>';

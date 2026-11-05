import { ollamaClient } from './Ollama/ollamaClient';
import { lmStudioClient } from './LMStudio/lmStudioClient';
import { deeplClient } from './DeepL/deeplClient';

export const aiClients = {
  [ollamaClient.id]: ollamaClient,
  [lmStudioClient.id]: lmStudioClient,
  [deeplClient.id]: deeplClient,
} as const;

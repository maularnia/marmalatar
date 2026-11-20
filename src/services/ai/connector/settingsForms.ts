import type { ComponentType } from 'react';
import DeepLSettingsForm from './DeepL/DeepLSettingsForm';
import { DEEPL_CLIENT_ID } from './DeepL/consts';
import LMStudioSettingsForm from './LMStudio/LMStudioSettingsForm';
import { LMSTUDIO_CLIENT_ID } from './LMStudio/consts';
import OllamaSettingsForm from './Ollama/OllamaSettingsForm';
import { OLLAMA_CLIENT_ID } from './Ollama/consts';
import type { AiClientSettingsFormProps } from './types';

// Each integration's settings form, keyed by its client's id. Kept apart from the clients (pure
// logic, no UI) so a client never imports its form: the forms take their client from the clients
// registry (./clients.ts), and only the settings UI imports this one.
export const aiClientSettingsForms: Record<string, ComponentType<AiClientSettingsFormProps>> = {
  [OLLAMA_CLIENT_ID]: OllamaSettingsForm,
  [LMSTUDIO_CLIENT_ID]: LMStudioSettingsForm,
  [DEEPL_CLIENT_ID]: DeepLSettingsForm,
};

import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import type Store from 'electron-store';
import { z } from 'zod';
import {
  cancelLMStudioRequest,
  listLMStudioModels,
  pingLMStudio,
  tokenizeWithLMStudio,
  translateWithLMStudio,
} from './lmStudio';
import {
  getDeepLApiKey,
  isDeepLEncryptionAvailable,
  listDeepLGlossaries,
  pingDeepL,
  setDeepLApiKey,
  translateWithDeepL,
} from './deepl';
import { createNamespacedRecordStore } from '../../utils/namespacedRecordStore';
import {
  LMStudioTranslationParamsSchema,
  LMStudioTranslationResultSchema,
  TokenizeWithLMStudioParamsSchema,
} from '../../../bridge/definitions/lmStudio';
import {
  DeepLTranslationParamsSchema,
  DeepLTranslationResultSchema,
  DeepLGlossaryOptionListSchema,
} from '../../../bridge/definitions/deepl';
import { OllamaSettingsV1Schema } from '../../../bridge/definitions/ollamaSettings';
import { LMStudioSettingsV1Schema } from '../../../bridge/definitions/lmStudioSettings';
import { DeepLSettingsV1Schema } from '../../../bridge/definitions/deepLSettings';
import {
  readOllamaSettings,
  readLMStudioSettings,
  readDeepLSettings,
} from '../../../bridge/contracts';

// Per-provider settings contracts (schema for writes, versioned reader for reads), keyed by the
// integration's own stable id -- see bridge/contracts.ts for each contract's version config. This
// mirrors the fixed id set in src/services/ai/clients.ts's aiClients map; an integrationId
// reaching here that isn't one of these 3 means a new integration was wired up on the FE without
// ever adding its bridge contract -- a structural bug, not legitimate data drift, so this throws
// rather than degrading gracefully.
const integrationSettingsContracts: Record<
  string,
  { schema: z.ZodTypeAny; reader: (raw: unknown) => unknown }
> = {
  ollama: { schema: OllamaSettingsV1Schema, reader: readOllamaSettings },
  lmstudio: { schema: LMStudioSettingsV1Schema, reader: readLMStudioSettings },
  deepl: { schema: DeepLSettingsV1Schema, reader: readDeepLSettings },
};

function requireIntegrationSettingsContract(integrationId: string) {
  const contract = integrationSettingsContracts[integrationId];
  if (!contract) {
    throw new Error(
      `registerAiIpc: no settings contract registered for integration id "${integrationId}"`
    );
  }
  return contract;
}

// Per-AI-integration settings (endpoint, model, etc.), keyed by the integration's own stable id --
// owned entirely by each AiClient; the renderer app never reads/writes these values directly.
export function registerAiIpc(appStore: Store): void {
  const integrationSettingsStore = createNamespacedRecordStore<unknown>(
    appStore,
    'integrationSettings'
  );

  ipcMain.handle('get-integration-settings', (_: IpcMainInvokeEvent, integrationId: string) => {
    const raw = integrationSettingsStore.get(integrationId);
    if (!raw) return null;
    return requireIntegrationSettingsContract(integrationId).reader(raw);
  });
  ipcMain.handle(
    'set-integration-settings',
    (_: IpcMainInvokeEvent, integrationId: string, settings: unknown) => {
      const { schema } = requireIntegrationSettingsContract(integrationId);
      integrationSettingsStore.set(integrationId, schema.parse(settings));
    }
  );

  ipcMain.handle('lmstudio-ping', (_: IpcMainInvokeEvent, host: string) => pingLMStudio(host));
  ipcMain.handle('lmstudio-list-models', (_: IpcMainInvokeEvent, host: string) =>
    listLMStudioModels(host)
  );
  ipcMain.handle('lmstudio-translate', async (_: IpcMainInvokeEvent, params: unknown) =>
    LMStudioTranslationResultSchema.parse(
      await translateWithLMStudio(LMStudioTranslationParamsSchema.parse(params))
    )
  );
  ipcMain.handle('lmstudio-cancel', (_: IpcMainInvokeEvent, requestId: string) =>
    cancelLMStudioRequest(requestId)
  );
  ipcMain.handle('lmstudio-tokenize', (_: IpcMainInvokeEvent, params: unknown) =>
    tokenizeWithLMStudio(TokenizeWithLMStudioParamsSchema.parse(params))
  );

  ipcMain.handle('deepl-encryption-available', () => isDeepLEncryptionAvailable());
  ipcMain.handle('get-deepl-api-key', () => getDeepLApiKey(appStore));
  ipcMain.handle('set-deepl-api-key', (_: IpcMainInvokeEvent, apiKey: string) =>
    setDeepLApiKey(appStore, apiKey)
  );
  ipcMain.handle('deepl-ping', (_: IpcMainInvokeEvent, apiKey: string) => pingDeepL(apiKey));
  ipcMain.handle('deepl-list-glossaries', async (_: IpcMainInvokeEvent, apiKey: string) =>
    DeepLGlossaryOptionListSchema.parse(await listDeepLGlossaries(apiKey))
  );
  ipcMain.handle('deepl-translate', async (_: IpcMainInvokeEvent, params: unknown) =>
    DeepLTranslationResultSchema.parse(
      await translateWithDeepL(DeepLTranslationParamsSchema.parse(params))
    )
  );
}

import type { IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import type { IntegrationSettings } from '../../../bridge/definitions/integrationSettings';
import { OllamaSettingsV1Schema } from '../../../bridge/definitions/ollamaSettings';
import { LMStudioSettingsV1Schema } from '../../../bridge/definitions/lmStudioSettings';
import { DeepLSettingsV1Schema } from '../../../bridge/definitions/deepLSettings';
import {
  readOllamaSettings,
  readLMStudioSettings,
  readDeepLSettings,
} from '../../../bridge/contracts';
import { Service } from '../service/Service';
import type { TVersioning } from '../service/storeVersioning';

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
      `IntegrationsService: no settings contract registered for integration id "${integrationId}"`
    );
  }
  return contract;
}

type TIntegrationsData = {
  // Keyed by integration id, each in its own versioned wire format
  integrationSettings: Record<string, unknown>;
};

// Per-AI-integration settings (endpoint, model, etc.), keyed by the integration's own stable id --
// owned entirely by each AiClient; the renderer app never reads/writes these values directly.
export class IntegrationsService extends Service<TIntegrationsData> {
  static readonly serviceName = 'integrations';

  readonly versioning: TVersioning<TIntegrationsData> = {
    0: (store) => ({
      ...(store.integrationSettings !== undefined && {
        integrationSettings: store.integrationSettings as Record<string, unknown>,
      }),
    }),
  };

  readonly handlers = [
    this.handle(
      'get-settings',
      (_: IpcMainInvokeEvent, integrationId: string): IntegrationSettings | null => {
        const raw = this.store.get('integrationSettings')?.[integrationId];
        if (!raw) return null;
        return requireIntegrationSettingsContract(integrationId).reader(raw) as IntegrationSettings;
      }
    ),
    this.handle(
      'set-settings',
      (_: IpcMainInvokeEvent, integrationId: string, settings: IntegrationSettings) => {
        const { schema } = requireIntegrationSettingsContract(integrationId);
        this.store.set('integrationSettings', {
          ...this.store.get('integrationSettings'),
          [integrationId]: schema.parse(settings),
        });
      }
    ),
  ] as const;
}

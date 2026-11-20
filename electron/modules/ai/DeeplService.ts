import type { IpcMainInvokeEvent } from 'electron';
import {
  DeepLGlossaryOptionListSchema,
  DeepLTranslationParamsSchema,
  DeepLTranslationResultSchema,
  type DeepLTranslationParams,
} from '../../../bridge/definitions/deepl';
import { EncryptionService, type TStoredSecret } from '../encryption/EncryptionService';
import { Service } from '../service/Service';
import type { TVersioning } from '../service/storeVersioning';
import { listDeepLGlossaries, pingDeepL, translateWithDeepL } from './deepl';

type TDeeplData = {
  // Kept in the app store, not a separate file -- the protection comes from OS-level encryption
  // (see EncryptionService), not from file location
  apiKey: TStoredSecret;
};

export class DeeplService extends Service<TDeeplData> {
  static readonly serviceName = 'deepl';

  readonly versioning: TVersioning<TDeeplData> = {
    0: (store) => ({
      ...(store.deeplApiKeyEncrypted !== undefined && {
        apiKey: store.deeplApiKeyEncrypted as TStoredSecret,
      }),
    }),
  };

  readonly handlers = [
    this.handle('get-api-key', () => {
      const stored = this.store.get('apiKey');
      if (!stored?.value) return '';
      // Unreadable ciphertext forces the user to enter the key again
      return EncryptionService.getInstance().decryptSecret(stored) ?? '';
    }),
    this.handle('set-api-key', (_: IpcMainInvokeEvent, apiKey: string) => {
      if (!apiKey) {
        this.store.delete('apiKey');
        return;
      }
      this.store.set('apiKey', EncryptionService.getInstance().encryptSecret(apiKey));
    }),
    this.handle('ping', (_: IpcMainInvokeEvent, apiKey: string) => pingDeepL(apiKey)),
    this.handle('list-glossaries', async (_: IpcMainInvokeEvent, apiKey: string) =>
      DeepLGlossaryOptionListSchema.parse(await listDeepLGlossaries(apiKey))
    ),
    this.handle('translate', async (_: IpcMainInvokeEvent, params: DeepLTranslationParams) =>
      DeepLTranslationResultSchema.parse(
        await translateWithDeepL(DeepLTranslationParamsSchema.parse(params))
      )
    ),
  ] as const;
}

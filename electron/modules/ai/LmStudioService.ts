import type { IpcMainInvokeEvent } from 'electron';
import {
  LMStudioTranslationParamsSchema,
  LMStudioTranslationResultSchema,
  TokenizeWithLMStudioParamsSchema,
  type LMStudioTranslationParams,
  type TokenizeWithLMStudioParams,
} from '../../../bridge/definitions/lmStudio';
import { Service } from '../service/Service';
import type { TVersioning } from '../service/storeVersioning';
import {
  cancelLMStudioRequest,
  listLMStudioModels,
  pingLMStudio,
  tokenizeWithLMStudio,
  translateWithLMStudio,
} from './lmStudio';

export class LmStudioService extends Service {
  static readonly serviceName = 'lmStudio';

  readonly versioning: TVersioning<Record<string, never>> = {
    0: () => ({}),
  };

  readonly handlers = [
    this.handle('ping', (_: IpcMainInvokeEvent, host: string) => pingLMStudio(host)),
    this.handle('list-models', (_: IpcMainInvokeEvent, host: string) => listLMStudioModels(host)),
    this.handle('translate', async (_: IpcMainInvokeEvent, params: LMStudioTranslationParams) =>
      LMStudioTranslationResultSchema.parse(
        await translateWithLMStudio(LMStudioTranslationParamsSchema.parse(params))
      )
    ),
    this.handle('cancel', (_: IpcMainInvokeEvent, requestId: string) =>
      cancelLMStudioRequest(requestId)
    ),
    this.handle('tokenize', (_: IpcMainInvokeEvent, params: TokenizeWithLMStudioParams) =>
      tokenizeWithLMStudio(TokenizeWithLMStudioParamsSchema.parse(params))
    ),
  ] as const;
}

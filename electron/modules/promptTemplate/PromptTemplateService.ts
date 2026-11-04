import type { IpcMainInvokeEvent } from 'electron';
import {
  PromptTemplateCacheEntryV1Schema,
  type PromptTemplateCacheEntry,
} from '../../../bridge/definitions/promptTemplateCacheEntry';
import { listFilesByExtension } from '../../utils/listFilesByExtension';
import { ScannerService } from '../scanner/ScannerService';
import { Service } from '../service/Service';
import type { TVersioning } from '../service/storeVersioning';

export class PromptTemplateService extends Service {
  static readonly serviceName = 'promptTemplate';

  readonly versioning: TVersioning<Record<string, never>> = {
    0: () => ({}),
  };

  readonly handlers = [
    this.handle('upsert-cache-entry', (_: IpcMainInvokeEvent, entry: PromptTemplateCacheEntry) => {
      const parsed = PromptTemplateCacheEntryV1Schema.parse(entry);
      ScannerService.getInstance().updateFolderScanCache((cache) => {
        cache.promptTemplates[parsed.fileName] = parsed;
      });
    }),
    this.handle('remove-cache-entry', (_: IpcMainInvokeEvent, fileName: string) => {
      ScannerService.getInstance().updateFolderScanCache((cache) => {
        delete cache.promptTemplates[fileName];
      });
    }),
    this.handle('list-files', () => {
      const workFolder = ScannerService.getInstance().getWorkFolderPath();
      return workFolder ? listFilesByExtension(workFolder, '.mrmlpt') : [];
    }),
  ] as const;
}

import type { IpcMainInvokeEvent } from 'electron';
import {
  GlossaryCacheEntryContractV1Schema,
  type GlossaryCacheEntryContract,
} from '../../../bridge/definitions/glossaryCacheEntry';
import { listFilesByExtension } from '../../utils/listFilesByExtension';
import { ScannerService } from '../scanner/ScannerService';
import { Service } from '../service/Service';
import type { TVersioning } from '../service/storeVersioning';

export class GlossaryService extends Service {
  static readonly serviceName = 'glossary';

  readonly versioning: TVersioning<Record<string, never>> = {
    0: () => ({}),
  };

  readonly handlers = [
    this.handle(
      'upsert-cache-entry',
      (_: IpcMainInvokeEvent, entry: GlossaryCacheEntryContract) => {
        const parsed = GlossaryCacheEntryContractV1Schema.parse(entry);
        ScannerService.getInstance().updateFolderScanCache((cache) => {
          cache.glossaries[parsed.fileName] = parsed;
        });
      }
    ),
    this.handle('remove-cache-entry', (_: IpcMainInvokeEvent, fileName: string) => {
      ScannerService.getInstance().updateFolderScanCache((cache) => {
        delete cache.glossaries[fileName];
      });
    }),
    this.handle('list-files', () => {
      const workFolder = ScannerService.getInstance().getWorkFolderPath();
      return workFolder ? listFilesByExtension(workFolder, '.mrmlg') : [];
    }),
  ] as const;
}

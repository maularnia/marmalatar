import type { IpcMainInvokeEvent } from 'electron';
import {
  AppSettingsContractV1Schema,
  type AppSettingsContract,
} from '../../../bridge/definitions/appSettings';
import { readAppSettingsContract } from '../../../bridge/contracts';
import { Service } from '../service/Service';
import type { TVersioning } from '../service/storeVersioning';

type TSettingsData = {
  // In its versioned wire format; readAppSettingsContract migrates on read
  appSettings: unknown;
};

export class SettingsService extends Service<TSettingsData> {
  static readonly serviceName = 'settings';

  readonly versioning: TVersioning<TSettingsData> = {
    0: (store) => ({
      ...(store.appSettings !== undefined && { appSettings: store.appSettings }),
    }),
  };

  readonly handlers = [
    this.handle('get', (): AppSettingsContract | null => {
      const raw = this.store.get('appSettings');
      return raw ? readAppSettingsContract(raw) : null;
    }),
    this.handle('set', (_: IpcMainInvokeEvent, settings: AppSettingsContract) => {
      this.store.set('appSettings', AppSettingsContractV1Schema.parse(settings));
    }),
  ] as const;
}

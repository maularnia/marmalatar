import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import type Store from 'electron-store';
import { AppSettingsContractV1Schema } from '../../bridge/definitions/appSettings';
import { readAppSettingsContract } from '../../bridge/contracts';

export function registerAppSettingsIpc(appStore: Store): void {
  ipcMain.handle('get-app-settings', () => {
    const raw = appStore.get('appSettings');
    return raw ? readAppSettingsContract(raw) : null;
  });
  ipcMain.handle('set-app-settings', (_: IpcMainInvokeEvent, settings: unknown) => {
    appStore.set('appSettings', AppSettingsContractV1Schema.parse(settings));
  });
}

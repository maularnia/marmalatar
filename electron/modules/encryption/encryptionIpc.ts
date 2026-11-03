import { ipcMain } from 'electron';
import { isEncryptionAvailable } from './encryption';

export function registerEncryptionIpc(): void {
  ipcMain.handle('is-encryption-available', () => isEncryptionAvailable());
}

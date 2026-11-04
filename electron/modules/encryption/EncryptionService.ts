import { safeStorage } from 'electron';
import { Service } from '../service/Service';
import type { TVersioning } from '../service/storeVersioning';

// A secret as persisted. Without OS-level encryption -- e.g. no keyring on a Linux desktop -- values
// are stored as plain text, and `encrypted` records which way each one was written so it's read
// back the same way.
export type TStoredSecret = { value: string; encrypted: boolean };

// OS-level encryption (keychain, DPAPI, libsecret) for secrets other services persist
export class EncryptionService extends Service {
  static readonly serviceName = 'encryption';

  readonly versioning: TVersioning<Record<string, never>> = {
    0: () => ({}),
  };

  readonly handlers = [this.handle('is-available', () => this.isAvailable())] as const;

  isAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  encryptSecret(value: string): TStoredSecret {
    if (!this.isAvailable()) return { value, encrypted: false };
    return { value: safeStorage.encryptString(value).toString('base64'), encrypted: true };
  }

  // Returns null when the ciphertext can't be read anymore (e.g. the OS keychain became
  // unavailable)
  decryptSecret(stored: TStoredSecret): string | null {
    if (!stored.encrypted) return stored.value;
    try {
      return safeStorage.decryptString(Buffer.from(stored.value, 'base64'));
    } catch {
      return null;
    }
  }
}

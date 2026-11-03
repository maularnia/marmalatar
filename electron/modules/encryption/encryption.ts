import { safeStorage } from 'electron';

// OS-level encryption (keychain, DPAPI, libsecret) for secrets the app persists. Without it -- e.g.
// no keyring on a Linux desktop -- values are stored as plain text, and `encrypted` records which
// way each one was written so it's read back the same way.
export type TStoredSecret = { value: string; encrypted: boolean };

export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

export function encryptSecret(value: string): TStoredSecret {
  if (!isEncryptionAvailable()) return { value, encrypted: false };
  return { value: safeStorage.encryptString(value).toString('base64'), encrypted: true };
}

// Returns null when the ciphertext can't be read anymore (e.g. the OS keychain became unavailable)
export function decryptSecret(stored: TStoredSecret): string | null {
  if (!stored.encrypted) return stored.value;
  try {
    return safeStorage.decryptString(Buffer.from(stored.value, 'base64'));
  } catch {
    return null;
  }
}

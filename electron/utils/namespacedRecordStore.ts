import type Store from 'electron-store';

// Generic accessor for the "one appStore key holding a Record<id, T>" pattern shared by
// per-project device state and per-AI-integration settings: each entry is read/written by its own
// id, independent of every other entry under the same top-level electron-store key.
export function createNamespacedRecordStore<T>(appStore: Store, storeKey: string) {
  return {
    get(id: string): T | null {
      const all = appStore.get(storeKey) as Record<string, T> | undefined;
      return all?.[id] ?? null;
    },
    set(id: string, value: T): void {
      const all = (appStore.get(storeKey) as Record<string, T> | undefined) ?? {};
      appStore.set(storeKey, { ...all, [id]: value });
    },
    remove(id: string): void {
      const all = { ...((appStore.get(storeKey) as Record<string, T> | undefined) ?? {}) };
      delete all[id];
      appStore.set(storeKey, all);
    },
  };
}

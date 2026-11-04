import type Store from 'electron-store';

// Version of the app store's layout as a whole. A store without the `version` key is version 0:
// the layout from before services had their own segments.
const STORE_VERSION = 1;

// Every version below STORE_VERSION -- each one needs a step in every service's `versioning`, so
// raising STORE_VERSION fails to compile until all services handle the new step.
type TStoreVersion = 0;

// Turns a service's segment at one version into the segment at the next. Gets the whole store as it
// is before that step, so a service can pick up data that used to live outside its segment.
type TVersionStep<TData> = (
  store: Readonly<Record<string, unknown>>,
  segment: Partial<TData>
) => Partial<TData>;

export type TVersioning<TData> = { readonly [V in TStoreVersion]: TVersionStep<TData> };

type TVersionedService = {
  readonly name: string;
  readonly versioning: { readonly [V in TStoreVersion]: TVersionStep<object> };
};

const VERSION_KEY = 'version';

// Brings the store up to STORE_VERSION, one version at a time. Runs before any window opens, so
// nothing reads a segment mid-migration.
export function migrateStore(appStore: Store, services: readonly TVersionedService[]): void {
  const stored = appStore.get(VERSION_KEY);
  let version = typeof stored === 'number' ? stored : 0;
  if (version > STORE_VERSION) {
    // Written by a newer build: its layout can't be migrated down, so leave it untouched
    console.warn(`Store version ${version} is newer than this build's ${STORE_VERSION}`);
    return;
  }

  for (; version < STORE_VERSION; version++) {
    const snapshot = { ...appStore.store };
    for (const service of services) {
      const segment = (snapshot[service.name] as object | undefined) ?? {};
      const step = service.versioning[version as TStoreVersion];
      appStore.set(service.name, step(snapshot, segment));
    }
    // Version 0 kept data at top-level keys. Each service has copied what it owns by now, so the
    // old keys go -- left in place, a later service could pick one of their names by accident.
    if (version === 0) {
      const serviceNames = new Set(services.map(({ name }) => name));
      for (const key of Object.keys(snapshot)) {
        if (key !== VERSION_KEY && !serviceNames.has(key)) appStore.delete(key);
      }
    }
  }
  appStore.set(VERSION_KEY, STORE_VERSION);
}

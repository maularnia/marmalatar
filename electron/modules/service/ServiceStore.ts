import type Store from 'electron-store';

// A service's own part of the app store: one root key named after the service, holding an object.
// Services only get this wrapper, never the app store itself, so they can't read or overwrite each
// other's data. The whole segment is read and written as one object rather than through
// electron-store's dot paths, so values containing dots in their keys stay intact.
export class ServiceStore<TData extends object> {
  constructor(
    private readonly appStore: Store,
    private readonly segmentKey: string
  ) {}

  private read(): Partial<TData> {
    return (this.appStore.get(this.segmentKey) as Partial<TData> | undefined) ?? {};
  }

  get<K extends keyof TData>(key: K): TData[K] | undefined {
    return this.read()[key];
  }

  set<K extends keyof TData>(key: K, value: TData[K]): void {
    this.appStore.set(this.segmentKey, { ...this.read(), [key]: value });
  }

  delete<K extends keyof TData>(key: K): void {
    const segment = { ...this.read() };
    delete segment[key];
    this.appStore.set(this.segmentKey, segment);
  }
}

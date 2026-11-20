import type { IpcMainInvokeEvent } from 'electron';
import type Store from 'electron-store';
import { ServiceStore } from './ServiceStore';
import type { TVersioning } from './storeVersioning';

type TKebabToCamel<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<TKebabToCamel<Tail>>}`
  : S;

function kebabToCamel<S extends string>(name: S): TKebabToCamel<S> {
  return name.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase()) as TKebabToCamel<S>;
}

type TListener = (event: IpcMainInvokeEvent, ...args: never[]) => unknown;

// Registers one IPC channel -- ipcMain.handle, supplied by main.ts
export type TRegisterHandler = (channel: string, listener: TListener) => void;

// What `handle` returns: the renderer-facing name and the listener, whose types ElectronAPI is
// derived from
export type THandler<TName extends string, TListenerFn extends TListener> = {
  readonly name: TName;
  readonly listener: TListenerFn;
};

type TAnyHandler = THandler<string, TListener>;

type THandlerFunction<H> = H extends {
  readonly listener: (event: IpcMainInvokeEvent, ...args: infer A) => infer R;
}
  ? (...args: A) => Promise<Awaited<R>>
  : never;

// The renderer-facing shape of one service: every handler, by name, as an async function
export type TServiceApi<S extends { readonly handlers: readonly TAnyHandler[] }> = {
  readonly [H in S['handlers'][number] as H['name']]: THandlerFunction<H>;
};

// What main.ts and store versioning need from any service
type TServiceInstance = {
  readonly name: string;
  readonly handlers: readonly TAnyHandler[];
  readonly versioning: TVersioning<object>;
};

type TServiceConstructor<T> = {
  readonly serviceName: string;
  new (store: ServiceStore<never>, register: TRegisterHandler): T;
};

// One area of the main process. A service owns a segment of the app store named after it, and IPC
// channels prefixed with its name. Each service is a singleton: main.ts initializes it once, and
// other services reach it through `getInstance()`.
export abstract class Service<TData extends object = Record<string, never>> {
  // Must be unique: it names both the store segment and the channel prefix
  static readonly serviceName: string;

  private static readonly instances = new Map<object, unknown>();

  static initialize(
    this: TServiceConstructor<TServiceInstance>,
    appStore: Store,
    register: TRegisterHandler
  ): TServiceInstance {
    if (Service.instances.has(this)) {
      throw new Error(`Service "${this.serviceName}" is already initialized`);
    }
    const instance = new this(new ServiceStore<never>(appStore, this.serviceName), register);
    Service.instances.set(this, instance);
    return instance;
  }

  static getInstance<T>(this: TServiceConstructor<T>): T {
    const instance = Service.instances.get(this);
    if (!instance) throw new Error(`Service "${this.serviceName}" isn't initialized`);
    return instance as T;
  }

  // Copied from the static, so it's set before any subclass field (`handlers` calls `handle`)
  readonly name: string;

  // Everything the service exposes to the renderer -- a list of `this.handle(...)` results
  abstract readonly handlers: readonly TAnyHandler[];

  // One step per store version below STORE_VERSION, see storeVersioning.ts
  abstract readonly versioning: TVersioning<TData>;

  constructor(
    protected readonly store: ServiceStore<TData>,
    private readonly register: TRegisterHandler
  ) {
    this.name = (this.constructor as unknown as { serviceName: string }).serviceName;
  }

  // Registers an IPC handler under `{service}.{camelCaseName}`: `this.handle('get-tracked-folder',
  // ...)` in the scanner service is the channel `scanner.getTrackedFolder`.
  protected handle<TName extends string, TListenerFn extends TListener>(
    name: TName,
    listener: TListenerFn
  ): THandler<TKebabToCamel<TName>, TListenerFn> {
    const camelName = kebabToCamel(name);
    this.register(`${this.name}.${camelName}`, listener);
    return { name: camelName, listener };
  }
}

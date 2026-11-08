import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';

// A domain's facade: one frozen object holding the selectors, actions, thunks and operations of a
// service, so typing the domain's name lists everything about it. Actions and thunks dispatch
// themselves on the app store (glossaries.rename(fileName, title), no dispatch(...)), and every
// selector also gets a reader of the current state under `get` (glossaries.get.items()).
//
//   export const glossaries = new Service('glossary', {
//     actions: { setGlossaryData },
//     selectors: { selectGlossaryItems },
//     functions: { renameGlossary, refreshGlossaries },
//   });
//   glossaries.setData(data), glossaries.rename(...), glossaries.selectItems, glossaries.get.items()
//
// Each member's key is its name with the keyword taken out: the first occurrence of the capitalized
// plural ("Glossaries"), then of the capitalized singular ("Glossary"), then the first letter
// lowercased. The plural goes first so "refreshPromptTemplates" becomes "refresh", not "refreshs".
// TKey below and toKey must apply the same rule; the assertions at the bottom pin it.
//
// The store is reached through the statics: store.ts hands it over with Service.connect once it's
// created, and services' operations use Service.dispatch and Service.select (they can't go through
// their own facade, which their index.ts builds from them). This module never imports the store,
// so services can build their facades at load.

type TVowel = 'a' | 'e' | 'i' | 'o' | 'u';

// "glossary" → "glossaries", but "overlay" → "overlays"
type TPlural<W extends string> = W extends `${string}${TVowel}y`
  ? `${W}s`
  : W extends `${infer S}y`
    ? `${S}ies`
    : `${W}s`;

type TStripOnce<S extends string, W extends string> = S extends `${infer A}${W}${infer B}`
  ? `${A}${B}`
  : S;

type TKey<K extends string, W extends string> = Uncapitalize<
  TStripOnce<TStripOnce<K, Capitalize<TPlural<W>>>, Capitalize<W>>
>;

// Key of a selector's reader under `get`: its facade key without the leading "select"
type TGetKey<K extends string, W extends string> =
  TKey<K, W> extends `select${infer R}` ? Uncapitalize<R> : never;

/* eslint-disable @typescript-eslint/no-explicit-any -- member shapes are matched structurally */
type TActionCreator = ((...args: any[]) => unknown) & { type: string; match: unknown };
type TThunkCreator = (...args: any[]) => (dispatch: any, getState: any) => unknown;
type TSelector = (state: any, ...args: any[]) => unknown;
/* eslint-enable @typescript-eslint/no-explicit-any */

type TBoundAction<A> = A extends (...args: infer P) => infer R
  ? ((...args: P) => R) & Pick<A, 'type' & keyof A> & Pick<A, 'match' & keyof A>
  : never;
type TBoundThunk<T> = T extends (...args: infer P) => (...thunkArgs: never[]) => infer R
  ? (...args: P) => R
  : never;
type TReader<S> = S extends (state: never, ...args: infer P) => infer R ? (...args: P) => R : never;

type TGroups = {
  // Slice action creators: dispatched when called, and still usable in addCase / isAnyOf
  actions?: Record<string, TActionCreator>;
  // Thunk creators: dispatched when called, returning what the thunk returns
  thunks?: Record<string, TThunkCreator>;
  // Selectors, as they are, for useAppSelector; each also gets a reader under `get`
  selectors?: Record<string, TSelector>;
  // Plain functions, as they are: a service's operations (which use Service.dispatch and
  // Service.select themselves) and IPC wrappers
  functions?: Record<string, unknown>;
};

type TRekeyed<W extends string, T, TMap extends 'action' | 'thunk' | 'as-is'> = {
  readonly [K in keyof T as TKey<K & string, W>]: TMap extends 'action'
    ? TBoundAction<T[K]>
    : TMap extends 'thunk'
      ? TBoundThunk<T[K]>
      : T[K];
};

type TApi<W extends string, G extends TGroups> = TRekeyed<W, G['actions'], 'action'> &
  TRekeyed<W, G['thunks'], 'thunk'> &
  TRekeyed<W, G['selectors'], 'as-is'> &
  TRekeyed<W, G['functions'], 'as-is'> & {
    readonly get: {
      readonly [K in keyof G['selectors'] as TGetKey<K & string, W>]: TReader<G['selectors'][K]>;
    };
  };

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function plural(word: string): string {
  return /[^aeiou]y$/.test(word) ? `${word.slice(0, -1)}ies` : `${word}s`;
}

function stripOnce(value: string, word: string): string {
  const index = value.indexOf(word);
  return index < 0 ? value : value.slice(0, index) + value.slice(index + word.length);
}

function toKey(name: string, keyword: string): string {
  const stripped = stripOnce(stripOnce(name, capitalize(plural(keyword))), capitalize(keyword));
  return stripped.charAt(0).toLowerCase() + stripped.slice(1);
}

type TConnectedStore = {
  dispatch: (action: never) => unknown;
  getState: () => unknown;
};

let connectedStore: TConnectedStore | null = null;

function requireStore(): TConnectedStore {
  if (!connectedStore) throw new Error('Service: store not connected');
  return connectedStore;
}

// Typed without the app's AppDispatch, which would make this module import root.ts and so every
// service -- the state type isn't needed to dispatch
type TDispatch = ThunkDispatch<unknown, undefined, UnknownAction>;

// Throws on construction if two members end up under the same key, so a clash can't silently hide
// one.
class ServiceFacade {
  /** Called once by store.ts with the app store. Services can't import it themselves: the store
   * imports their reducers, and they build their facades with this class. */
  static connect(store: TConnectedStore): void {
    connectedStore = store;
  }

  /** The app store's dispatch, for a service's operations. */
  static dispatch: TDispatch = ((action: unknown) =>
    requireStore().dispatch(action as never)) as TDispatch;

  /** Runs a selector on the app store's current state -- what a facade's `get` readers do. */
  static select<TArgs extends unknown[], TResult>(
    selector: (state: never, ...args: TArgs) => TResult,
    ...args: TArgs
  ): TResult {
    return (selector as (state: unknown, ...rest: TArgs) => TResult)(
      requireStore().getState(),
      ...args
    );
  }

  readonly get: Readonly<Record<string, unknown>>;

  constructor(
    keyword: string,
    { actions = {}, thunks = {}, selectors = {}, functions = {} }: TGroups
  ) {
    const members: Record<string, unknown> = {};
    const get: Record<string, unknown> = {};
    const add = (target: Record<string, unknown>, key: string, name: string, member: unknown) => {
      if (key in target) {
        throw new Error(`Service('${keyword}'): "${name}" clashes on key "${key}"`);
      }
      target[key] = member;
    };

    for (const [name, creator] of Object.entries(actions)) {
      const bound = (...args: unknown[]) => ServiceFacade.dispatch(creator(...args) as never);
      add(members, toKey(name, keyword), name, Object.assign(bound, creator));
    }
    for (const [name, thunk] of Object.entries(thunks)) {
      const bound = (...args: unknown[]) => ServiceFacade.dispatch(thunk(...args) as never);
      add(members, toKey(name, keyword), name, bound);
    }
    for (const [name, selector] of Object.entries(selectors)) {
      const key = toKey(name, keyword);
      add(members, key, name, selector);
      const getKey = key.replace(/^select/, '');
      add(get, getKey.charAt(0).toLowerCase() + getKey.slice(1), name, (...args: unknown[]) =>
        ServiceFacade.select(selector as (state: never, ...rest: unknown[]) => unknown, ...args)
      );
    }
    for (const [name, fn] of Object.entries(functions)) {
      add(members, toKey(name, keyword), name, fn);
    }
    if ('get' in members) throw new Error(`Service('${keyword}'): "get" is reserved`);

    this.get = Object.freeze(get);
    Object.assign(this, members);
    Object.freeze(this);
  }
}

// The class's members depend on the groups it's given, which a class declaration can't express, so
// its constructor is retyped to return the rekeyed facade type.
type TServiceConstructor = (new <const W extends string, const G extends TGroups>(
  keyword: W,
  groups: G
) => TApi<W, G>) &
  Pick<typeof ServiceFacade, 'connect' | 'dispatch' | 'select'>;

export const Service = ServiceFacade as unknown as TServiceConstructor;

// Compile-time checks that TKey follows the rule described above
const _plural: TKey<'refreshPromptTemplates', 'promptTemplate'> = 'refresh';
const _singular: TKey<'selectCurrentGlossary', 'glossary'> = 'selectCurrent';
const _leading: TKey<'selectGlossaryItems', 'glossary'> = 'selectItems';
const _vowelY: TKey<'closeAllOverlays', 'overlay'> = 'closeAll';
const _untouched: TKey<'pathChanged', 'folder'> = 'pathChanged';
const _getKey: TGetKey<'selectGlossaryItems', 'glossary'> = 'items';
void [_plural, _singular, _leading, _vowelY, _untouched, _getKey];

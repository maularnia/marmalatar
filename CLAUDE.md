## Project description

Project name: Marmalatar

Marmalatar is a .srt/.ass subtitles editor with subtitle synchronization and automated AI-translation functionality.
Marmalatar is Belarussian language-first
Marmaltar is translation workflow-first. Edit workflow is secondary

## Techologies
Marmalatar is based on nodestack + ts

- React Front-end with Typescript
- Node Back-end with Typescript
- Elector wrapper
- Compiled using electron-vite
- i18n for interface localization
- typo-js for spellchecking
- self-made css theming framework
- react-router navigation
- react-redux for application in-memory store

## Supported systems

- Windows
- Linux: deb, pacman, rpm, AppImage

## Project folder structure

Electron BE: electron
Bridge: bridge
FE: src

### Bridge
Bridge - contains contracts for BE and FE to ensure them for both sides. 
- BE and FE are allowed to import files form bridge folder.
- bridge is not allowed to improt files outside bridge folder.
- BE is not allowed to import from FE and the other way around.
- Shared BE and FE files must be hosted at brdige folder

### Electron (main process)

- `electron/modules/*/*Service.ts` - one `Service` subclass per area (scanner, project, settings, media, deepl...). Each is a singleton initialized once in `electron/main.ts`; other services reach it with `XService.getInstance()`
- A service's static `serviceName` names both its store segment and its IPC channel prefix. `this.handle('get-tracked-folder', fn)` registers `scanner.getTrackedFolder`, and every `this.handle` result goes into the service's `handlers` list
- `this.store` (`ServiceStore`) reads and writes only the service's own segment. Services never touch each other's data directly, only through methods the owning service exposes
- `ElectronAPI` (exported from `electron/main.ts`) is derived from the `SERVICES` list, so a new handler shows up on `window.electronAPI.<service>.<handler>` with its types. Preload builds that object from handler names main passes in, so it needs no edits
- `ScannerService` owns the tracked folder and its file listing (name, path, extension, hash of path + modification time); the listing never reads file contents. It caches the listing until it drops it itself: on folder change, on its own `writeFile`/`moveFile`/`deleteFile`, and on `scanner.dropCache` (the Rescan button). Its generic file methods (`readFile`, `writeFile`, `moveFile`, `deleteFile`, `fileExists`) are for other services only, never exposed over IPC
- The project, prompt template and glossary services own their files: `get`/`set`/`create`/`rename`/`set-emoji`/`set-languages`/`delete`, keyed by projectId or file name, each checked against the normalized listing first. The renderer reads whole files but writes only the body (lines and characters, pairs, template text). The header (id, name or title, emoji, languages) is written only by the service, through those dedicated calls. Languages stay in the file so they travel with it between devices. Writes return the updated list entry, which the renderer applies instead of computing anything itself
- File names come from `bridge/fileNames.ts`. `create` and `rename` return null when the name a title maps to is taken
- Translation progress is computed by the project service from the file's lines whenever it (re)reads the file, and stored in the project's `state` (`ProjectState` V2). The renderer's `set-state` writes only its preferences (`TProjectStatePrefs`)
- The project, prompt template and glossary services keep their own `list` in their segment and renormalize it against `scanner.scan()` on every read and write (`scanner/normalizeEntries.ts`): unchanged files are matched by hash, only new or changed files are read, and entries whose file is gone are dropped. Projects are keyed by the `projectId` inside the file, so a rename keeps order, hidden, state and progress
- `MediaService` keeps metadata per video in its segment (`videos`, keyed by `getFileCacheKey`: path, size, mtime): the thumbnail, the audio tracks ffprobe lists, and per track the converted audio and waveform file names in `{trackedFolder}/.mrmlcache`. It names every cache file itself (`{hash}.jpg`, `{hash}-{trackId}.m4a`, `{hash}-{trackId}.json`), so a changed video gets a fresh entry. `cleanup-cache` drops entries no project's video maps to and every cache file no entry references
- Store layout is versioned as a whole (`electron/modules/service/storeVersioning.ts`). Raising `STORE_VERSION` requires a step in every service's `versioning`. Steps may be async (they can use the same code as the service at runtime, e.g. ffprobe); `main.ts` awaits the migration before opening the window

## UI structure (src)

root folder `src`.

- src/assets - fonts, typo-js dictionaries, auto-generated css, icons
- src/i18n - interface localization files
- src/layout - application layout and layout-specific components.
- src/partials - forms and genmeral chunk of code widely resused across paa (settings forms and form chunks)
- src/providers - business logic core of the application.
- src/segments - logical chunks/groups of components grouped by functional similarity (dialogs, menu, overlays, pages/views)
- src/services - pure services providing utility functions for providers to perform specific set of tasks (spellchecking/ai-translations) `spellcheck` runs dictionary parsing and text checks in one Web Worker shared by every editor, because that work is too slow for the UI thread. Suggestions take seconds per word, so they're only requested for the word the caret is on. `ipc` is the renderer's only way to reach the main process: consumers use the `IPC` singleton (`IPC.projects.get(...)`), whose properties are `IPCSegment` subclasses from `ipc/segments`, one per theme. ESLint forbids `window.electronAPI` and direct segment imports anywhere else.
- src/services/<domain> - domain services, one folder each, replacing a slice file in `src/store/slices` (`prompt` and `editor` so far; the other slices haven't moved yet). `slice.ts` defines the slice (state, reducers, extraReducers, selectors); `actions.ts` holds the operations as plain (async) functions, not thunks, plus IPC wrappers; they go into the facade's `functions` group; `index.ts` builds the facade with `api()` and is the only entry point from outside (`import { promptTemplates, promptReducer } from '@src/services/prompt'`). Imports run index → actions → slice: actions use `dispatch` and `select(localSelector)` exported from `createApi.ts` with their own slice's actions and selectors, never their own facade, which would be a cycle; other domains are reached through their facades. When the owner's facade can't be imported without a cycle (the ai, project and glossary slices import the editor), read its raw state with a local structural type (`select((state: TBulkJobState) => state.ai.currentBulkJob?.running)`) and say why in a comment. Operations reach dialogs, toasts and video through `src/providers/bridges`, never through hooks
- src/store - application store and store-slices. Each slice exposes its selectors, actions and thunks only through domain facades built at the bottom of the slice file with `api(keyword, { actions, thunks, selectors, functions })` (`src/store/createApi.ts`): `glossaries` (glossary.ts), `promptTemplates` (`src/services/prompt`), `editor` (`src/services/editor`), `projects`, `workingFolder`, `overlays`, `ai`, `settings`. A member's key is its name with the keyword taken out (`selectGlossaryItems` → `glossaries.selectItems`, `refreshPromptTemplates` → `promptTemplates.refresh`), so name declarations to read well once it's gone (`createGlossary`, not `createGlossaryFile`). `api()` throws on load if two members land on the same key. Actions and thunks dispatch themselves on the app store (`editor.mergeLines(...)`, never `dispatch(editor.mergeLines(...))`, which would dispatch twice); each selector also gets a reader of the current state under `get` (`glossaries.get.items()`, the `select` prefix dropped). `store.ts` hands the store to `connectApi`. `thunks.ts` exposes its thunks as the `app` facade (`app.hydrate()`, `app.workingFolderPick()`). Inside a slice file code uses local names for its actions and selectors; everywhere else, other slices included, uses the facade. Store code reads the current state through `get` too, the slice's own facade included (`promptTemplates.get.current()`), instead of `const state = getState()` snapshots; `getState()` stays only where a snapshot is the point (before/after comparisons in middleware) or a facade can't be imported without a cycle. Thunks that would make slices import each other stay plain exports of `thunks.ts`
- src/theme - theme service. Extracted to a separate folder due to scale and complexity
- src/toolkit - UI atomic compoenet library of genreal purpose. Inputs, Icons, Selects, Tags...
- src/utils - commonly used general-perpose utility functions or set of functions split into files by theme.

## Providers

Providers are contexts that provide functionality for the applications.
They sit in the middle between store/services and pure UI view components or providing UX functionality for te app (keystroke support, focus zones, focus traps etc.)

### Structure

Flat files in `src/providers`, with a subfolder only when a provider needs companion files (`ConfirmationProvider/`, `GlobalKeystroke/`, each with its own `types.ts`).

The Menu domain is split into layers. Each layer consumes the one before it through its hook:

1. `*RefsProvider` - DOM element registries (no React state, no re-renders)
2. `*ActionsProvider` - `handle*` business logic: reads refs and the store, dispatches, opens dialogs, emits messages
3. `*KeystrokeProvider` - maps keys to actions and holds no business logic

The editor and glossary have no Refs or Actions providers: their logic lives in their services, with DOM registries as module-level state next to it. Only their Keystroke providers remain.

Bridges (`src/providers/bridges`) hand provider APIs to code outside React, the services. `ConfirmationProvider`, `MessageHelmetProvider` and `VideoProvider` register into them on mount, and calling one before that throws:
- `confirmation` - `createConfirm(Content, props)`, the module-level counterpart of `useConfirm`. Dialogs opened by services export plain functions built on it next to the dialog (`confirmMerge` in `dialogs/lineMerge/mergeConfirmation.tsx`)
- `messages` - `pushMessage`, passed to `emit*Message`
- `video` - `playPause`, `seekToLine`

Mount points:

- App-wide, in this order (`src/main.tsx`): `MessageHelmetProvider` > `LocaleProvider` > `ThemeProvider` > `MenuStateProvider` > `PopperPortalProvider` > `GlobalKeystrokeDispatcher` > `ConfirmationProvider` > `VideoProvider`. The order matters: each one may use the ones above it.
- Editor: `EditorKeystrokeProvider` in `src/layout/EditorLayout.tsx`
- Menu: `MenuRefsProvider` > `MenuActionsProvider` > `MenuKeystrokeProvider` in `src/segments/menu/index.tsx`
- Glossary: `GlossaryKeystrokeProvider` in `src/segments/overlays/Glossary/Glossary.tsx`

### Files

Editor:
- No Refs/Actions providers: everything editor is the `editor` service in `src/services/editor` -- lines and undo history, focus and line navigation (`editor.focusInput`, `navigateLine`, `focus`), line insert/split/merge/remove, timing adjustments including shifting all lines, undo/redo, bulk operations (auto-merge, cleanup, copy all, complete all), the edit/translate mode (`editor.toggleEditMode`, `get.isEditMode`), playing from the focused line. The line inputs live in a module-level registry (`editor.registerLineInput`), as does the split cursor offset (`editor.setSplitCursor`), which the project service clears when the open project changes
- AI translation is `ai.translateLine` / `ai.translateUntranslatedLines`; adding text or the current selection to a glossary is `glossaries.addEntryFromText` / `addEntryFromLineSelection`
- `EditorKeystrokeProvider` - editor shortcuts, calling `editor.*`, `ai.*` and `glossaries.*`, plus `useEditorKeystroke` exposing which modifier keys are held. Shortcuts are skipped while an AI translation is running

Glossary:
- No Refs/Actions providers: everything glossary is the `glossaries` service in `src/store/slices/glossary.ts` -- the folder's glossary files, the open glossary's pairs, the translation's selection and resolved entries, and the editor's pair focus (`glossaries.focusPairInput`, `movePairFocus`, `insertPair`, `deletePair`). Focus lives in the store, as in the editor; the pair input elements live in a module-level registry next to it (`glossaries.registerPairInput`), since DOM elements aren't state. Deleting a pair asks first through `useDeleteGlossaryEntryConfirmation().confirmAndDeletePair`
- `GlossaryKeystrokeProvider` - glossary shortcuts, calling `glossaries.*`

Menu:
- `MenuStateProvider` - sidebar compact/expanded state
- `MenuRefsProvider` - menu item elements by key
- `MenuActionsProvider` - combined keyboard navigation across all menu items, rename, open, create and delete for projects, prompt templates and glossaries
- `MenuKeystrokeProvider` - menu shortcuts, keeps the sidebar expanded while focus is inside it or a rename/create is in progress

Video:
- `VideoProvider` - video and audio elements (muted video plus a separate audio element, always driven together), play/pause/seek, duration, thumbnail, waveform peaks. The playhead is kept in `currentTimeRef`, not state, so playback doesn't re-render consumers

Keystrokes:
- `GlobalKeystroke/GlobalKeystrokeDispatcher` - the only `document`-scoped shortcuts: `ctrl+1..0` zone slots, `esc`, settings, export, theme keys. Also the zone registry (`useGlobalKeystrokeRegistry`) and `useGlobalKeystrokePause`
- `ScopedKeyHubProvider` - scopes `react-keyhub` to a wrapper DOM node. Used by `KeystrokeZone` (`src/layout/components/KeystrokeZone`), not mounted directly

Dialogs and messages:
- `ConfirmationProvider/ConfirmationProvider` - dialog host, `useConfirm` and `useInfoWindow`. The window logic `useConfirm` and the bridge's `createConfirm` share is in `confirmWindow.tsx`
- `ConfirmationProvider/ConfirmationKeyhubProvider` - `y`/`n`/`esc` on the open dialog, with its own `EventBus` scoped to the dialog element
- `MessageHelmetProvider` - toasts through `useMessageHelmet().pushMessage` (or the messages bridge outside React)
- `PopperPortalProvider` - shared portal root for overlays, read with `usePopperPortal`

Side effects only, no context:
- `LocaleProvider` - syncs i18n with the store's UI locale
- `ThemeProvider` - syncs screen size and resolved theme into the store, sets the `theme-*` class on `body`

### Coding patterns

Context shape:
- One context per file: `createContext` with a full default value, an exported `function useX()` hook, and a named `export function XProvider`. The context object itself is never exported
- The file name matches the provider name, and context types are named `TXContext`
- Function defaults use a `const noop = providerNoop('XContext')` from `src/utils/noop.ts`, which throws when called without the provider. A context that holds a value uses the value's empty state (`PopperPortalProvider` defaults to `undefined` until its root mounts)
- Function props are wrapped in `useCallback`. Context values that are objects go through `useMemoizedObject` from `src/utils`, never an inline `value={{ ... }}`

Reading state:
- Inside handlers, read the store with the facade's `get` (`settings.get.askBeforeMerge()`), not `useAppSelector`. Handlers then stay stable and the provider doesn't re-render on every store change
- Use `useAppSelector` only when the provider must react to a change, for example to clear stale refs or focus
- Hold values that change often or don't affect rendering in refs

Actions:
- Public functions are named `handle*`, including ones that only set state (`handleSetIsCreatingGlossary`). Exposed state keeps its own name
- Confirmations come from `use*Confirmation` hooks in `src/segments/dialogs/*` (services use the plain `confirm*` functions next to them), and check `selectAskBefore*` settings where they exist
- `src/segments/dialogs` is the only part of `src/segments` that providers may import from. A hook needed by a provider that isn't a dialog goes in `src/utils` (`useProjectLoader`)
- User feedback goes through `emit*Message(pushMessage, ...)` from `src/messages.ts`, never through direct `pushMessage` text

Refs:
- `register*Ref(index, column, el)` stores the element, and `el === null` removes it. A row is dropped once all its columns are empty, so maps clean themselves on unmount

Keystrokes:
- Declare shortcuts as a module-level object with `satisfies ShortcutSettings`, and wrap `useShortcut` in a local hook typed to its keys
- Shortcut handlers only resolve the target (the focused line or pair), call `preventDefault` and call an action (a `handle*` from the Actions layer, or a service operation such as `editor.mergeLines`). Reading the store for that is fine, but dispatching, editing data and navigation rules belong in the Actions layer or the service
- Wrap the tree in `KeystrokeZone`. Handlers live in a child component that returns `null` (`EditorShortcuts`, `MenuShortcuts`, `GlossaryShortcuts`), because `useShortcut` needs the `KeyHubProvider` that `KeystrokeZone` creates
- Keep `scope: ShortcutScope.GLOBAL` in zone shortcuts: scoping comes from the zone's DOM target, and `KeystrokeZone` pauses the shortcuts while focus is outside it
- Only `GlobalKeystrokeDispatcher` may target `document`. Pausing is keyed by a `source` string so independent callers can't un-pause each other. `ConfirmationProvider` uses this to block global shortcuts while a dialog is open

Dialogs:
- `useConfirm(...).confirm()` (and `createConfirm(...).confirm()`) resolves `true` or `false`. Dismissing is not an error, and the promise rejects only on real failures
- `confirm()` resolves after the exit animation finishes (immediately for `animate: false` windows), so callers can safely move focus afterwards


## General code-style

- Types should be prefixed with T (ex. TPerson, TObject etc.)
- Enums should not be in plural
- Avoid default exports. Always use named exports.
- Types not used anywhere else should not be exported. After introducing changes, check if all the exported types are used somewhere outside the file and remove export if they are not.
- Comments explain why, especially timing, focus and event-order constraints. Keep them when moving code



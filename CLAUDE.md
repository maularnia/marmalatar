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
- `ScannerService` owns the tracked folder and its file listing (name, path, extension, hash of path + modification time); the listing never reads file contents. It caches the listing until it drops it itself: on folder change, on its own `writeFile`/`moveFile`/`deleteFile`, and on `scanner.rescan` (the Rescan button and folder select), which returns the new listing; `scanner.getScan` returns the cached one (startup). Its generic file methods (`readFile`, `writeFile`, `moveFile`, `deleteFile`, `fileExists`) are for other services only, never exposed over IPC
- The project, prompt template and glossary services own their files: `get`/`set`/`create`/`rename`/`set-emoji`/`set-languages`/`delete`, keyed by projectId or file name, each checked against the normalized listing first. The renderer reads whole files but writes only the body (lines and characters, pairs, template text). The header (id, name or title, emoji, languages) is written only by the service, through those dedicated calls. Languages stay in the file so they travel with it between devices. Writes return the updated list entry, which the renderer applies instead of computing anything itself
- Project files are format version 2 (`PROJECT_FILE_VERSION`): besides the header and body they hold `spellcheck`, the project's own accepted words per language code (`BE_be`). Only the project service writes it (`add-to-dictionary`), keeping it on every other rewrite; version 1 files are still listed, upgraded by the renderer's contract when opened (empty `spellcheck`) and written as version 2 on their next save
- `SpellcheckService` owns the global spellcheck dictionaries, `{languageCode}.mrmlspell` files in the tracked folder (`{ version, wordlist }`): `list` reads them all, `add-to-dictionary` creates a language's file on its first word, `remove-from-dictionary` deletes it with its last. It keeps nothing in the store
- File names come from `bridge/fileNames.ts`. `create` and `rename` return null when the name a title maps to is taken
- Translation progress is computed by the project service from the file's lines whenever it (re)reads the file, and stored in the project's `state` (`ProjectState` V2). The renderer's `set-state` writes only its preferences (`TProjectStatePrefs`)
- The project, prompt template and glossary services keep their own `list` in their segment and renormalize it against `scanner.scan()` on every read and write (`scanner/normalizeEntries.ts`): unchanged files are matched by hash, only new or changed files are read, and entries whose file is gone are dropped. Projects are keyed by the `projectId` inside the file, so a rename keeps order, hidden, state and progress
- `MediaService` keeps metadata per video in its segment (`videos`, keyed by `getFileCacheKey`: path, size, mtime): the thumbnail, the displayed aspect ratio (width / height, from ffprobe, corrected for non-square pixels and rotation), the audio tracks ffprobe lists, and per track the converted audio and waveform file names in `{trackedFolder}/.mrmlcache`. `get-video-metadata` returns the thumbnail and aspect ratio, each null on failure without failing the other. It names every cache file itself (`{hash}.jpg`, `{hash}-{trackId}.m4a`, `{hash}-{trackId}.json`), so a changed video gets a fresh entry. `cleanup-cache` drops entries no project's video maps to and every cache file no entry references. Archived (hidden) projects count as deleted there (`ProjectService.listVideoPaths` skips them), so their cache goes with the next cleanup, not when they're archived, and is extracted again when a restored project is opened
- Store layout is versioned as a whole (`electron/modules/service/storeVersioning.ts`). Raising `STORE_VERSION` requires a step in every service's `versioning`. Steps may be async (they can use the same code as the service at runtime, e.g. ffprobe); `main.ts` awaits the migration before opening the window

## UI structure (src)

root folder `src`.

- src/assets - fonts, typo-js dictionaries, auto-generated css, icons
- src/i18n - interface localization files
- src/layout - application layout and layout-specific components.
- src/partials - forms and genmeral chunk of code widely resused across paa (settings forms and form chunks)
- src/providers - business logic core of the application.
- src/segments - logical chunks/groups of components grouped by functional similarity (menu, overlays, pages/views). Dialogs aren't here: each lives in the service that opens it
- src/services - pure services providing utility functions for providers to perform specific set of tasks (spellchecking/ai-translations) `spellcheck` runs dictionary parsing and text checks in one Web Worker shared by every editor, because that work is too slow for the UI thread. Suggestions take seconds per word, so they're only requested for the word the caret is on. `ipc` is the renderer's only way to reach the main process: consumers use the `IPC` singleton (`IPC.projects.get(...)`), whose properties are `IPCSegment` subclasses from `ipc/segments`, one per theme. ESLint forbids `window.electronAPI` and direct segment imports anywhere else.
- src/services/<domain> - domain services, one folder each, holding all the store state: `prompt`, `project` (with the editor), `glossary`, `ai`, `media`, `menu`, `settings`, `folder`, `modal`, `toast` and `spellcheck` (the user dictionaries: the tracked folder's global ones, loaded on every `folder.onScanComplete`, and the open project's, taken from the loaded file through the `projects.fileLoaded` event; `spellcheck.selectIgnoredWords(state, language)` is what editors pass to the checking worker, and `addToGlobalDictionary`/`addToProjectDictionary`/`removeFromGlobalDictionary` write the file first, then the store; the Settings overlay's Spellchecker tab lists the global dictionaries' words to remove). Overlays have no service of their own: each overlay's open state belongs to its owner (the prompt and glossary editors are open while `promptTemplates.get.current()` / `glossaries.get.current()` is set; `settings` owns the settings and export overlays with `settings.open()`/`close()`, `openExport()`/`closeExport()`; `projects` owns the Archive overlay with `projects.openArchive()`/`closeArchive()`, opened from the menu with `menu.openArchive()`). Callers (the menu service, `GlobalKeystrokeDispatcher`, the Settings and Export buttons, `folder.pick`) close the others before opening one, so overlays are exclusive today; `src/segments/overlays/Overlays.tsx` renders each from its owner's flag. `slice.ts` defines the slice (state, reducers, extraReducers, selectors); `actions.ts` holds the operations as plain (async) functions, not thunks, plus IPC wrappers; they go into the facade's `functions` group; `index.ts` builds the facade with `new Service(...)` and is the only entry point from outside (`import { promptTemplates, promptReducer } from '@src/services/prompt'`). Imports run index → actions → slice: actions use `Service.dispatch` and `Service.select(localSelector)` (statics of `src/services/Service.ts`) with their own slice's actions and selectors, never their own facade, which would be a cycle; other domains are reached through their facades. When the owner's facade can't be imported without a cycle (the ai and glossary services import the project service), read its raw state with a local structural type (`select((state: TBulkJobState) => state.ai.currentBulkJob?.running)`) and say why in a comment. Operations reach dialogs through the `modal` facade and toasts through `toast.push(make*Message(...))`, never through hooks. When a service must update another one that imports it, it dispatches an event action instead of calling it, and the other slice reacts in its extraReducers: `folder.pathChanged` (the project, editor, media, prompt, glossary, settings and ai slices reset what belonged to the old folder), and `promptTemplates.templateSaved`, which the ai slice uses to take a saved edit of the template the translation uses. When the other service has to do async work (an IPC call), it subscribes to a plain event of the one it imports instead: the folder service owns scanning and picking (`folder.scan()`, `folder.pick()`, `folder.loadTracked()` at startup) and hands the listing to `folder.onScanStart`/`onScanComplete(scan)` subscribers, which the project, prompt and glossary services register in their `index.ts` to refresh their lists. A service may keep supporting code in subfolders, e.g. `ai/connector` holds the AI integrations (DeepL, LM Studio, Ollama clients, their settings forms, batching). A client is pure logic and never imports its form; each provider's id and setting keys live in its `consts.ts`, the forms are registered in `connector/settingsForms.ts` (imported only by the settings UI), and a form takes its client from the `connector/clients.ts` registry (`aiClients[OLLAMA_CLIENT_ID]`), and `ai/bulkJob.ts` the running job's controller, shared by slice and actions. One service may hold two slices: `project` keeps the editor in `project/editor/`, and its `index.ts` builds both facades (`import { projects, editor } from '@src/services/project'`)
- src/store - the store's wiring, no slices of its own: `root.ts` combines the services' reducers, `store.ts` creates the store and adds the services' persistence middlewares (the open project's autosave in `src/services/project/autosave.ts`, the app settings in `src/services/settings/persist.ts`), `hooks.ts` (`useAppSelector`, `useAppSelectors`). Startup (`settings.load`, `folder.loadTracked`, the AI integration) is in `src/main.tsx`. Each service exposes its selectors, actions and operations only through domain facades built in its `index.ts` with `new Service(keyword, { actions, thunks, selectors, functions })` (`src/services/Service.ts`): `glossaries` (`src/services/glossary`), `promptTemplates` (`src/services/prompt`), `projects` and `editor` (`src/services/project`), `menu` (`src/services/menu`), `ai` (`src/services/ai`), `media` (`src/services/media`), `settings` (`src/services/settings`), `folder` (`src/services/folder`), `modal` (`src/services/modal`), `toast` (`src/services/toast`). A member's key is its name with the keyword taken out (`selectGlossaryItems` → `glossaries.selectItems`, `refreshPromptTemplates` → `promptTemplates.refresh`), so name declarations to read well once it's gone (`createGlossary`, not `createGlossaryFile`). `new Service()` throws on load if two members land on the same key. Actions and thunks dispatch themselves on the app store (`editor.mergeLines(...)`, never `dispatch(editor.mergeLines(...))`, which would dispatch twice); each selector also gets a reader of the current state under `get` (`glossaries.get.items()`, the `select` prefix dropped). `store.ts` hands the store to `Service.connect`. Inside a service code uses local names for its actions and selectors; everywhere else, other services included, uses the facade. Store code reads the current state through `get` too, the slice's own facade included (`promptTemplates.get.current()`), instead of `const state = getState()` snapshots; `getState()` stays only where a snapshot is the point (before/after comparisons in middleware) or a facade can't be imported without a cycle. Operations that would make services import each other are inverted instead: the imported service emits an event action or a subscribable event and the importer reacts (see `folder.pathChanged`, `folder.onScanComplete`)
- src/theme - theme service. Extracted to a separate folder due to scale and complexity
- src/toolkit - UI atomic compoenet library of genreal purpose. Inputs, Icons, Selects, Tags...
- src/utils - commonly used general-perpose utility functions or set of functions split into files by theme.

## Providers

Providers are contexts that provide functionality for the applications.
They sit in the middle between store/services and pure UI view components or providing UX functionality for te app (keystroke support, focus zones, focus traps etc.)

### Structure

Flat files in `src/providers`, with a subfolder only when a provider needs companion files (`GlobalKeystroke/`, with its own `types.ts`).

The Menu domain is split into layers. Each layer consumes the one before it through its hook:

1. `*RefsProvider` - DOM element registries (no React state, no re-renders)
2. `*ActionsProvider` - `handle*` business logic: reads refs and the store, dispatches, opens dialogs, emits messages
3. `*KeystrokeProvider` - maps keys to actions and holds no business logic

The editor, glossary and menu have no Refs or Actions providers: their logic lives in their services, with DOM registries as module-level state next to it. Only their Keystroke providers remain.

Bridges (`src/providers/bridges`) hand provider APIs to code outside React, the services. `NavigationBridge` registers into them on mount, and calling one before that throws:
- `navigation` - `navigate(to)`, registered by `NavigationBridge`, mounted inside `MemoryRouter` in `src/main.tsx`

Mount points:

- App-wide, in this order (`src/main.tsx`): `LocaleProvider` > `ThemeProvider` > `PopperPortalProvider` > `GlobalKeystrokeDispatcher`, with `App`, the modal host `Modals` (from `src/services/modal`) and the toast host `Toasts` (from `src/services/toast`) side by side inside. The order matters: each one may use the ones above it.
- Editor: `EditorKeystrokeProvider` in `src/layout/EditorLayout.tsx`
- Menu: `MenuKeystrokeProvider` in `src/segments/menu/index.tsx`
- Glossary: `GlossaryKeystrokeProvider` in `src/segments/overlays/Glossary/Glossary.tsx`

### Files

Project:
- No providers: the `projects` facade of `src/services/project` owns the open/create/start-new/delete/archive flows, navigation included (`projects.open(entry)`, `create(params)`, `startNew()`, `delete(id, name)`, `archive(id)`, `restore(id)`). Archived projects are list entries with `hidden` set (`set-hidden` in the main process): the menu shows `projects.selectVisibleList`, the Archive overlay `selectArchivedList` (alphabetical), and archiving the open project saves and closes it first, with the loader and dialogs through the bridges

Editor:
- No Refs/Actions providers: everything editor is the `editor` facade of the project service, in `src/services/project/editor` -- lines and undo history, focus and line navigation (`editor.focusLine(lineIndex, column?)` -- the column defaults to the one the current mode edits; it moves DOM focus only when the input doesn't already have it, so inputs call it from their own `onFocus` to sync the store, and `focusLine(null)` clears the focused column; `navigateLine`, `focusEditor`), line insert/split/merge/remove, timing adjustments including shifting all lines, undo/redo, bulk operations (auto-merge, cleanup, copy all, complete all), the edit/translate mode (`editor.toggleEditMode`, `get.isEditMode`), playing from the focused line. The line inputs live in a module-level registry (`editor.registerLineInput`), as does the split cursor offset (`editor.setSplitCursor`), which the project service clears when the open project changes
- AI translation is `ai.translateLine` / `ai.translateUntranslatedLines`; adding text or the current selection to a glossary is `glossaries.addEntryFromText`, with `editor.getSourceSelection(lineIndex)` for the selection
- `EditorKeystrokeProvider` - editor shortcuts, calling `editor.*`, `ai.*` and `glossaries.*`, plus `useEditorKeystroke` exposing which modifier keys are held. Shortcuts are skipped while an AI translation is running

Glossary:
- No Refs/Actions providers: everything glossary is the `glossaries` service in `src/services/glossary` -- the folder's glossary files, the open glossary's pairs, the translation's selection and resolved entries, and the editor's pair focus (`glossaries.focusPairInput`, `movePairFocus`, `insertPair`, `deletePair`). Focus lives in the store, as in the editor; the pair input elements live in a module-level registry next to it (`glossaries.registerPairInput`), since DOM elements aren't state. `glossaries.deletePair` asks first (`confirmDeleteGlossaryEntry`, through the confirmation bridge)
- `GlossaryKeystrokeProvider` - glossary shortcuts, calling `glossaries.*`

Menu:
- No Refs/Actions/State providers: everything menu is the `menu` service in `src/services/menu` -- the renaming key, "creating" flags and the sidebar's collapse state (`menu.selectIsCompact`, `selectIsDynamic`; held open while the pointer is over it, an item has focus or a rename/create is in progress) in its slice; the item elements in a module-level registry (`menu.registerItem`); combined keyboard navigation across all menu items, rename, and open, create and delete for projects, prompt templates and glossaries in its actions
- `MenuKeystrokeProvider` - menu shortcuts calling `menu.*`, keeps the sidebar expanded while focus is inside it or a rename/create is in progress

Media:
- No provider: everything video is the `media` service in `src/services/media` -- the open project's video file path and audio track (the path and the track's id are persisted with the project's device preferences; the track's language and title label the player's audio button, `media.getAudioTrackLabel`), the video's track count (the player offers another track only when there's more than one), duration, thumbnail, aspect ratio (the player box follows it, 16:9 while it's null, i.e. without a video), waveform peaks and the active line (the one playing at the current position) in its slice; the video and audio elements (muted video plus a separate audio element, always driven together, registered with `media.registerVideoElement`/`registerAudioElement`), play/pause/seek, and `applyVideo(selection | null)` / `applyAudioTrack(track)`, which put a finished selection in the store, in its actions. The playback position is a module variable read with `media.getCurrentTimeMs()`, not state, so playback doesn't re-render consumers. The editor imports media to seek and play, so media reads the lines' timings from raw state. An unplayable video is reported by `media.reportVideoUnplayable()`; closing the project and navigating away is the player's job

Keystrokes:
- `GlobalKeystroke/GlobalKeystrokeDispatcher` - the only `document`-scoped shortcuts: `ctrl+1..0` zone slots, `esc`, settings, export, theme keys. Also the zone registry (`useGlobalKeystrokeRegistry`) and `useGlobalKeystrokePause`
- `ScopedKeyHubProvider` - scopes `react-keyhub` to a wrapper DOM node. Used by `KeystrokeZone` (`src/layout/components/KeystrokeZone`), not mounted directly

Dialogs and messages:
- Dialog windows are the `modal` service (`src/services/modal`), not a provider: see Dialogs below
- Toasts are the `toast` service (`src/services/toast`), not a provider: `toast.push({ type, title, message })`, usually with a builder from the pushing service's own `toasts/`: `toast.push(makeLineDeletedMessage())`. Its slice keeps the serializable part (id, type, title), the message (may be a ReactNode) lives in `toast/registry.ts`, and the `Toasts` host renders them
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
- A component that needs more than one value from the store reads them in one call: `const [a, b] = useAppSelectors(x.selectA, y.selectB)` (`src/store/hooks.ts`), not several `useAppSelector` calls or an object selector with `shallowEqual`
- Hold values that change often or don't affect rendering in refs

Actions:
- Public functions are named `handle*`, including ones that only set state (`handleSetIsCreatingGlossary`). Exposed state keeps its own name
- Confirmations come from the plain `confirm*` functions in the owning service's `dialogs/<name>/` (built on `modal.confirm`), and check `selectAskBefore*` settings where they exist
- Providers don't import from `src/segments`. A hook needed by a provider goes in `src/utils`
- User feedback goes through `toast.push(make*Message(...))`: the `make*Message` builders in each service's `toasts/` (`src/services/<svc>/toasts/index.ts`) return the toast's params (translated when called) and the caller pushes them explicitly, never inline toast text

Refs:
- `register*Ref(index, column, el)` stores the element, and `el === null` removes it. A row is dropped once all its columns are empty, so maps clean themselves on unmount

Keystrokes:
- Declare shortcuts as a module-level object with `satisfies ShortcutSettings`, and wrap `useShortcut` in a local hook typed to its keys
- Shortcut handlers only resolve the target (the focused line or pair), call `preventDefault` and call an action (a `handle*` from the Actions layer, or a service operation such as `editor.mergeLines`). Reading the store for that is fine, but dispatching, editing data and navigation rules belong in the Actions layer or the service
- Wrap the tree in `KeystrokeZone`. Handlers live in a child component that returns `null` (`EditorShortcuts`, `MenuShortcuts`, `GlossaryShortcuts`), because `useShortcut` needs the `KeyHubProvider` that `KeystrokeZone` creates
- Keep `scope: ShortcutScope.GLOBAL` in zone shortcuts: scoping comes from the zone's DOM target, and `KeystrokeZone` pauses the shortcuts while focus is outside it
- Only `GlobalKeystrokeDispatcher` may target `document`. Pausing is keyed by a `source` string so independent callers can't un-pause each other. The registry pauses itself (source `'modal'`) while `modal.selectIsOpen` is true, so global shortcuts are blocked while a dialog is open

Dialogs:
- Services own the loaders, dialogs and toasts of their operations. UI components call the operation (`promptTemplates.saveAndClose()`, `menu.commitItemTitle(kind, fileName, title)`, `projects.changeVideo()`, `projects.changeAudioTrack()`, `media.cleanCache()`) and only await the result, or catch an error to show it inline -- they never call `modal.*` or a service's dialogs to orchestrate one
- Services that `toolkit` depends on (`settings`, and `folder`, which settings imports) must not open modals or loaders: the modal host imports toolkit components, so it would be an import cycle
- The `modal` service (`src/services/modal`) owns every dialog window: services and dialog modules call `modal.confirm(Content, props, { confirmButton, dismissButton, validate, animate })` and `modal.showInfo(Content, props, promise, { delay, minLifeTime, animate })` (the loader, `modal.load({ messages }, promise, options)` in `modal/loader/`, is built on it). Each call opens a fresh window; there are no window objects to create or destroy
- A service keeps what it shows next to its actions: `toasts/index.ts` (its `make*Message` builders, not on the facade) and `dialogs/<name>/` (the dialog component and the `confirm*`/`select*` function that opens it). Dialog components build their layout from the pieces `@src/services/modal` exports (`DialogBodySmall`, `DialogTitle`, ...). Nothing is shared between services; a toast or dialog two services need belongs to the service that owns the underlying operation (e.g. the media service's video selection reports video processing failures for everyone)
- Video selection is a chain of popups in `src/services/media/videoFlow.ts`, the only code that calls `IPC.media.extractWaveformPeaks`, `listAudioTracks` or `getVideoMetadata` (`extractAudio` is also called by the player's audio element, to re-resolve the cached file on mount): `media.pickVideo({ banner, dismissLabel })` (video popup, which reads the metadata -- a null thumbnail or aspect ratio counts as a broken video -- then the track list behind a loader, the track popup, skipped with a single track, then audio conversion and waveform behind a loader, each failure with its own popup to go back or give up), `media.pickAudioTrack()` (another track of the open video, only with more than one) and `media.loadSavedVideo(path, trackId)` (a project's saved video, one loader, no questions). They return plain data and never touch the store, so giving up or failing at any step changes nothing. The project service persists the result first (`projects.changeVideo()`, `changeAudioTrack()`, opening a project) and applies it with `media.applyVideo`/`applyAudioTrack` only once it's saved. The video is picked only from the editor (the player and its empty state); the Import page creates projects without one
- Its slice keeps only serializable data (the open windows: id, kind, validity, animate); the content, buttons and the pending promise live in `modal/registry.ts`. The `Modals` host renders them, with `FocusTrap` and `ModalKeyhub` (`y`/`n`/`esc`, scoped to the dialog element)
- Button labels (`confirmButton.children`, `dismissButton.children`, both required) are translated by the caller each time it opens the dialog -- dialog modules pass the options object, `t()` calls included, inside their `confirm*` function, never as a module-level object, which would be translated at import, before the saved locale is applied. The modal service only receives plain strings
- Dialog content components take `TModalContentProps` (`onValidChange`); confirm stays disabled while the content reports invalid
- `modal.confirm()` resolves `true` or `false`. Dismissing is not an error
- `modal.confirm()` resolves after the exit animation finishes (immediately for `animate: false` windows), so callers can safely move focus afterwards


## General code-style

- Types should be prefixed with T (ex. TPerson, TObject etc.)
- Enums should not be in plural
- Avoid default exports. Always use named exports.
- Types not used anywhere else should not be exported. After introducing changes, check if all the exported types are used somewhere outside the file and remove export if they are not.
- Comments explain why, especially timing, focus and event-order constraints. Keep them when moving code



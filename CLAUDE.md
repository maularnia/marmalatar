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

## UI structure (src)

root folder `src`.

- src/assets - fonts, typo-js dictionaries, auto-generated css, icons
- src/i18n - interface localization files
- src/layout - application layout and layout-specific components.
- src/partials - forms and genmeral chunk of code widely resused across paa (settings forms and form chunks)
- src/providers - business logic core of the application.
- src/segments - logical chunks/groups of components grouped by functional similarity (dialogs, menu, overlays, pages/views)
- src/services - pure services providing utility functions for providers to perform specific set of tasks (spellchecking/ai-translations)
- src/store - application store and store-slices
- src/theme - theme service. Extracted to a separate folder due to scale and complexity
- src/toolkit - UI atomic compoenet library of genreal purpose. Inputs, Icons, Selects, Tags...
- src/utils - commonly used general-perpose utility functions or set of functions split into files by theme.

## Providers

Providers are contexts that provide functionality for the applications.
They sit in the middle between store/services and pure UI view components or providing UX functionality for te app (keystroke support, focus zones, focus traps etc.)

### Structure

Flat files in `src/providers`, with a subfolder only when a provider needs companion files (`ConfirmationProvider/`, `GlobalKeystroke/`, each with its own `types.ts`).

Feature domains (Editor, Glossary, Menu) are split into layers. Each layer consumes the one before it through its hook:

1. `*RefsProvider` - DOM element registries (no React state, no re-renders)
2. `*ActionsProvider` - `handle*` business logic: reads refs and the store, dispatches, opens dialogs, emits messages
3. `*KeystrokeProvider` - maps keys to actions and holds no business logic

`EditorStateProvider` and `GlossaryStateProvider` only compose the Refs and Actions layers. The Keystroke layer is mounted separately, deeper in the tree.

Mount points:

- App-wide, in this order (`src/main.tsx`): `MessageHelmetProvider` > `LocaleProvider` > `ThemeProvider` > `MenuStateProvider` > `PopperPortalProvider` > `GlobalKeystrokeDispatcher` > `ConfirmationProvider` > `VideoProvider`. The order matters: each one may use the ones above it.
- Editor: `EditorStateProvider` in `src/layout/GeneralLayout.tsx`, `EditorKeystrokeProvider` in `src/layout/EditorLayout.tsx`
- Menu: `MenuRefsProvider` > `MenuActionsProvider` > `MenuKeystrokeProvider` in `src/segments/menu/index.tsx`
- Glossary: `GlossaryStateProvider` in `src/segments/overlays/Overlays.tsx`, `GlossaryKeystrokeProvider` in `src/segments/overlays/Glossary/Glossary.tsx`

### Files

Editor:
- `EditorStateProvider` - composes `EditorRefsProvider`, `EditorActionsProvider`, `EditorAIActionsProvider`
- `EditorRefsProvider` - input elements per line and column (`source`/`output`/`character`), plus the split cursor offset, which resets when the project changes
- `EditorActionsProvider` - focus and line navigation, line insert/split/merge/remove, timing adjustments including shifting all lines, undo/redo, bulk operations (auto-merge, cleanup, copy all), edit mode toggle, playing from the focused line
- `EditorAIActionsProvider` - single-line and bulk AI translation, add text or the current selection to a glossary
- `EditorKeystrokeProvider` - editor shortcuts, plus `useEditorKeystroke` exposing which modifier keys are held. Shortcuts are skipped while an AI translation is running

Glossary:
- `GlossaryStateProvider` - composes `GlossaryRefsProvider`, `GlossaryActionsProvider`
- `GlossaryRefsProvider` - input elements per pair and column (`original`/`translation`), cleared when the glossary changes
- `GlossaryActionsProvider` - pair focus, insert and delete. Focus lives in local state here, not in the store as in the editor
- `GlossaryKeystrokeProvider` - glossary shortcuts

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
- `ConfirmationProvider/ConfirmationProvider` - dialog host, `useConfirm` and `useInfoWindow`
- `ConfirmationProvider/ConfirmationKeyhubProvider` - `y`/`n`/`esc` on the open dialog, with its own `EventBus` scoped to the dialog element
- `MessageHelmetProvider` - toasts through `useMessageHelmet().pushMessage`
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
- Inside handlers, read the store with `fromCurrentStore(selector)`, not `useAppSelector`. Handlers then stay stable and the provider doesn't re-render on every store change
- Use `useAppSelector` only when the provider must react to a change, for example to clear stale refs or focus
- Hold values that change often or don't affect rendering in refs

Actions:
- Public functions are named `handle*`, including ones that only set state (`handleSetIsCreatingGlossary`). Exposed state keeps its own name
- Confirmations come from `use*Confirmation` hooks in `src/segments/dialogs/*`, and check `selectAskBefore*` settings where they exist
- `src/segments/dialogs` is the only part of `src/segments` that providers may import from. A hook needed by a provider that isn't a dialog goes in `src/utils` (`useProjectLoader`)
- User feedback goes through `emit*Message(pushMessage, ...)` from `src/messages.ts`, never through direct `pushMessage` text

Refs:
- `register*Ref(index, column, el)` stores the element, and `el === null` removes it. A row is dropped once all its columns are empty, so maps clean themselves on unmount

Keystrokes:
- Declare shortcuts as a module-level object with `satisfies ShortcutSettings`, and wrap `useShortcut` in a local hook typed to its keys
- Shortcut handlers only resolve the target (the focused line or pair), call `preventDefault` and call a `handle*` action. Reading the store for that is fine, but dispatching, editing data and navigation rules belong in the Actions layer
- Wrap the tree in `KeystrokeZone`. Handlers live in a child component that returns `null` (`EditorShortcuts`, `MenuShortcuts`, `GlossaryShortcuts`), because `useShortcut` needs the `KeyHubProvider` that `KeystrokeZone` creates
- Keep `scope: ShortcutScope.GLOBAL` in zone shortcuts: scoping comes from the zone's DOM target, and `KeystrokeZone` pauses the shortcuts while focus is outside it
- Only `GlobalKeystrokeDispatcher` may target `document`. Pausing is keyed by a `source` string so independent callers can't un-pause each other. `ConfirmationProvider` uses this to block global shortcuts while a dialog is open

Dialogs:
- `useConfirm(...).confirm()` resolves `true` or `false`. Dismissing is not an error, and the promise rejects only on real failures
- `confirm()` resolves after the exit animation finishes (immediately for `animate: false` windows), so callers can safely move focus afterwards


## General code-style

- Types should be prefixed with T (ex. TPerson, TObject etc.)
- Enums should not be in plural
- Avoid default exports. Always use named exports.
- Types not used anywhere else should not be exported. After introducing changes, check if all the exported types are used somewhere outside the file and remove export if they are not.
- Comments explain why, especially timing, focus and event-order constraints. Keep them when moving code



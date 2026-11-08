import { createListenerMiddleware } from '@reduxjs/toolkit';
import { Service } from '@src/services/Service';
import { ProjectSaveV1Schema, type TProjectFileBody } from '@src/utils/data/schemas';
import type { RootState } from '@store/root';
import {
  buildProjectEditorStateSaveData,
  saveProjectLanguages,
  saveProjectToDisk,
  writeProjectEditorState,
} from './actions';
import { selectProjectId } from './slice';

// Autosave of the open project: its file body, its languages (the file header) and its device
// preferences. store.ts adds the middleware; the listeners use this service's own operations, not
// its facade, which index.ts builds from them.

export const projectAutosaveMiddleware = createListenerMiddleware();

// ── File body ────────────────────────────────────────────────────────────────

type PersistedEditorFields = keyof TProjectFileBody['editor'];

// Only the file body: the header (name, emoji, languages) is written by the main process through
// its own calls. Derived from the body schema instead of hand-maintained, so the file schema and
// what's watched for autosave can never silently drift apart -- the `satisfies` clause fails to
// compile if the schema names a field that doesn't exist on the editor slice.
const AUTO_SAVE_WATCHED_EDITOR_FIELDS = Object.keys(
  ProjectSaveV1Schema.shape.editor.shape
) as PersistedEditorFields[] satisfies readonly (keyof RootState['editor'])[];

function hasAutoSaveStateChanged(prev: RootState, next: RootState): boolean {
  return AUTO_SAVE_WATCHED_EDITOR_FIELDS.some((field) => prev.editor[field] !== next.editor[field]);
}

projectAutosaveMiddleware.startListening({
  predicate: (_action, currentState, previousState) =>
    hasAutoSaveStateChanged(previousState as RootState, currentState as RootState),

  effect: async (_action, api) => {
    api.cancelActiveListeners();
    await api.delay(1500);

    // Skips a project that has no file yet
    await saveProjectToDisk();
  },
});

// ── Languages ────────────────────────────────────────────────────────────────

// Languages are part of the file header, so they go through their own call. Rare enough that a
// file write per change is fine; the main process skips the write when nothing changed, which is
// the case right after a project is loaded or created.
projectAutosaveMiddleware.startListening({
  predicate: (_action, currentState, previousState) => {
    const prev = (previousState as RootState).project;
    const next = (currentState as RootState).project;
    return (
      prev.sourceLanguage !== next.sourceLanguage || prev.targetLanguage !== next.targetLanguage
    );
  },

  effect: async (_action, api) => {
    api.cancelActiveListeners();
    // Swapping the direction changes both languages in two actions: write once
    await api.delay(100);
    await saveProjectLanguages();
  },
});

// ── Device preferences ───────────────────────────────────────────────────────

// Device-specific editor/UI preferences (editorMode, isVideoCollapsed, video path and track) -- these aren't
// project content, so they're persisted to electron-store keyed by projectId instead of triggering
// a .mrml file rewrite.
const EDITOR_STATE_WATCHED_PATHS = {
  editor: ['mode', 'isVideoCollapsed'],
  media: ['videoFilePath', 'audioTrack'],
} as const satisfies {
  editor: readonly (keyof RootState['editor'])[];
  media: readonly (keyof RootState['media'])[];
};

type EditorStateWatchedPathsType = typeof EDITOR_STATE_WATCHED_PATHS;

function hasEditorStateChanged(prev: RootState, next: RootState): boolean {
  for (const [sliceKey, props] of Object.entries(EDITOR_STATE_WATCHED_PATHS) as [
    keyof EditorStateWatchedPathsType,
    readonly string[],
  ][]) {
    for (const prop of props) {
      if (
        prev[sliceKey][prop as keyof (typeof prev)[typeof sliceKey]] !==
        next[sliceKey][prop as keyof (typeof next)[typeof sliceKey]]
      ) {
        return true;
      }
    }
  }
  return false;
}

projectAutosaveMiddleware.startListening({
  predicate: (_action, currentState, previousState) =>
    hasEditorStateChanged(previousState as RootState, currentState as RootState),

  effect: async (_action, api) => {
    api.cancelActiveListeners();
    await api.delay(1500);

    const projectId = Service.select(selectProjectId);
    if (!projectId) return;

    await writeProjectEditorState(projectId, buildProjectEditorStateSaveData());
  },
});

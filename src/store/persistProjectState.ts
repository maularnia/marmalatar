import { createListenerMiddleware } from '@reduxjs/toolkit';
import { ProjectSaveV1Schema, type TProjectFileBody } from '@src/utils/data/schemas';
import { AppSettingsSchema, buildAppSettingsSaveData } from '@utils/appSettingsFile';
import type { RootState } from './root';
import { projects } from '@src/services/project';
import { IPC } from '@src/services/ipc/IPC';

// `version` is a wire/persistence-only field added by the bridge contract's VersionedSchema base --
// it has no counterpart in the `app` redux slice, so it's excluded from the watched key list below.
const APP_SETTINGS_KEYS = AppSettingsSchema.keyof().options.filter(
  (key) => key !== 'version'
) as (keyof RootState['settings'])[];

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

export const persistProjectStateMiddleware = createListenerMiddleware();

persistProjectStateMiddleware.startListening({
  predicate: (_action, currentState, previousState) =>
    hasAutoSaveStateChanged(previousState as RootState, currentState as RootState),

  effect: async (_action, api) => {
    api.cancelActiveListeners();
    await api.delay(1500);

    // Skips a project that has no file yet
    await projects.saveToDisk();
  },
});

// Languages are part of the file header, so they go through their own call. Rare enough that a
// file write per change is fine; the main process skips the write when nothing changed, which is
// the case right after a project is loaded or created.
persistProjectStateMiddleware.startListening({
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
    await projects.saveLanguages();
  },
});

persistProjectStateMiddleware.startListening({
  predicate: (_action, currentState, previousState) => {
    const prev = (previousState as RootState).settings;
    const next = (currentState as RootState).settings;
    return APP_SETTINGS_KEYS.some((key) => prev[key] !== next[key]);
  },

  effect: async (_action, api) => {
    const state = api.getState() as RootState;
    await IPC.settings.setAppSettings(buildAppSettingsSaveData(state));
  },
});

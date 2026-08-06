import { createListenerMiddleware } from '@reduxjs/toolkit';
import { ProjectSaveV1Schema } from '@src/utils/data/schemas';
import { AppSettingsSchema, buildAppSettingsSaveData } from '@utils/appSettingsFile';
import { z } from 'zod';
import type { AppDispatch, RootState } from './root';
import { saveProjectToDisk } from './thunks';

// `version` is a wire/persistence-only field added by the bridge contract's VersionedSchema base --
// it has no counterpart in the `app` redux slice, so it's excluded from the watched key list below.
const APP_SETTINGS_KEYS = AppSettingsSchema.keyof().options.filter(
  (key) => key !== 'version'
) as (keyof RootState['app'])[];

type PersistedFileShape = z.infer<typeof ProjectSaveV1Schema>;
type PersistedProjectFields = keyof PersistedFileShape['project'];
type PersistedEditorFields = keyof PersistedFileShape['editor'];

// Derived directly from ProjectSaveV1Schema instead of hand-maintained, so the file
// schema and what's watched for autosave can never silently drift apart -- the
// `satisfies` clause fails to compile if the schema names a field that doesn't
// exist on the matching redux slice.
const AUTO_SAVE_WATCHED_PATHS = {
  project: Object.keys(ProjectSaveV1Schema.shape.project.shape) as PersistedProjectFields[],
  editor: Object.keys(ProjectSaveV1Schema.shape.editor.shape) as PersistedEditorFields[],
} as const satisfies {
  project: readonly (keyof RootState['project'])[];
  editor: readonly (keyof RootState['editor'])[];
};

type AutoSaveWatchedPathsType = typeof AUTO_SAVE_WATCHED_PATHS;

function hasAutoSaveStateChanged(prev: RootState, next: RootState): boolean {
  for (const [sliceKey, props] of Object.entries(AUTO_SAVE_WATCHED_PATHS) as [
    keyof AutoSaveWatchedPathsType,
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

export const persistProjectStateMiddleware = createListenerMiddleware();

persistProjectStateMiddleware.startListening({
  predicate: (_action, currentState, previousState) =>
    hasAutoSaveStateChanged(previousState as RootState, currentState as RootState),

  effect: async (_action, api) => {
    api.cancelActiveListeners();
    await api.delay(1500);

    const state = api.getState() as RootState;
    const { projectId, currentProjectFilePath: filePath } = state.project;
    if (!projectId || !filePath) return;

    await (api.dispatch as AppDispatch)(saveProjectToDisk(filePath));
  },
});

persistProjectStateMiddleware.startListening({
  predicate: (_action, currentState, previousState) => {
    const prev = (previousState as RootState).app;
    const next = (currentState as RootState).app;
    return APP_SETTINGS_KEYS.some((key) => prev[key] !== next[key]);
  },

  effect: async (_action, api) => {
    const state = api.getState() as RootState;
    await window.electronAPI.setAppSettings(buildAppSettingsSaveData(state));
  },
});

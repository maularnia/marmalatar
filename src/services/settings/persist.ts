import { createListenerMiddleware } from '@reduxjs/toolkit';
import { IPC } from '@src/services/ipc/IPC';
import type { RootState } from '@store/root';
import { AppSettingsSchema, buildAppSettingsSaveData } from '@utils/appSettingsFile';

// Writes the app settings to the main process whenever a persisted one changes. store.ts adds the
// middleware.

// `version` is a wire/persistence-only field added by the bridge contract's VersionedSchema base --
// it has no counterpart in the settings slice, so it's excluded from the watched key list below.
const APP_SETTINGS_KEYS = AppSettingsSchema.keyof().options.filter(
  (key) => key !== 'version'
) as (keyof RootState['settings'])[];

export const settingsPersistMiddleware = createListenerMiddleware();

settingsPersistMiddleware.startListening({
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

import i18n from '@src/i18n';
import { IPC } from '@src/services/ipc/IPC';
import { dispatch } from '@store/createApi';
import { parseAppSettings } from '@utils/appSettingsFile';
import { hydrateSettings } from './slice';

// The settings service's operations. Saving is the persistProjectState middleware's job: it writes
// the settings whenever they change.

// Reads the persisted settings into the store. The UI language is switched here, before the first
// render, so it doesn't flash the default; LocaleProvider keeps it in step afterwards. Settings
// written by an older build are saved back normalized.
export async function loadSettings(): Promise<void> {
  const raw = await IPC.settings.getAppSettings();
  const persisted = parseAppSettings(raw);
  dispatch(hydrateSettings(persisted));
  void i18n.changeLanguage(persisted.uiLocale);
  if (JSON.stringify(raw) !== JSON.stringify(persisted)) {
    void IPC.settings.setAppSettings(persisted);
  }
}

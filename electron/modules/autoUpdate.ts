import { app } from 'electron';
import { autoUpdater } from 'electron-updater';

// Checks electron-builder.yml's `publish` feed (baked into the packaged app as
// resources/app-update.yml) for a newer version, downloads it in the background, and shows a
// native OS notification when it's ready to install on next restart.
export function registerAutoUpdate(): void {
  if (!app.isPackaged) return; // never check in dev -- there's no update feed to hit anyway

  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.error('Auto-update check failed:', err);
  });
}

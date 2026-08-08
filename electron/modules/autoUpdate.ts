import { app } from 'electron';

// Checks electron-builder.yml's `publish` feed (baked into the packaged app as
// resources/app-update.yml) for a newer version, downloads it in the background, and shows a
// native OS notification when it's ready to install on next restart.
export function registerAutoUpdate(): void {
  if (!app.isPackaged) return; // never check in dev -- there's no update feed to hit anyway

  // Disabled: electron-builder.yml's publish.url is still a placeholder
  // (https://<your-domain>/updates/), so there's no real feed to hit yet.
  // Re-enable this call once a real update source is configured:
  // autoUpdater.checkForUpdatesAndNotify().catch((err) => {
  //   console.error('Auto-update check failed:', err);
  // });
}

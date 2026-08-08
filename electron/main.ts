import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import Store from 'electron-store';
import { registerProjectIpc } from './modules/projectIpc';
import { registerPromptTemplateIpc } from './modules/promptTemplateIpc';
import { registerGlossaryIpc } from './modules/glossaryIpc';
import { registerScannerIpc } from './modules/scanner/scannerIpc';
import { registerAppSettingsIpc } from './modules/appSettingsIpc';
import { registerMediaIpc } from './modules/mediaIpc';
import { registerAiIpc } from './modules/ai/aiIpc';
import { registerAutoUpdate } from './modules/autoUpdate';

const appStore = new Store();

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 640,
    minHeight: 640,
    // __dirname is out/main/ both in dev and production, so ../ resolves to the project root.
    // In production the icon comes from electron-builder's `icon` config; setting it here would
    // fail inside the ASAR.
    ...(!app.isPackaged && {
      icon: path.join(
        __dirname,
        process.platform === 'win32' ? '../favicon.ico' : '../electron/assets/icon-256.png'
      ),
    }),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

registerProjectIpc(appStore);
registerPromptTemplateIpc(appStore);
registerGlossaryIpc(appStore);
registerScannerIpc(appStore);
registerAppSettingsIpc(appStore);
registerMediaIpc(appStore);
registerAiIpc(appStore);

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  registerAutoUpdate();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

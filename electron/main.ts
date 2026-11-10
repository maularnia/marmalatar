import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import path from 'path';
import Store from 'electron-store';
import { DeeplService } from './modules/ai/DeeplService';
import { IntegrationsService } from './modules/ai/IntegrationsService';
import { LmStudioService } from './modules/ai/LmStudioService';
import { EncryptionService } from './modules/encryption/EncryptionService';
import { GlossaryService } from './modules/glossary/GlossaryService';
import { MediaService } from './modules/media/MediaService';
import { SpellcheckService } from './modules/spellcheck/SpellcheckService';
import { ProjectService } from './modules/project/ProjectService';
import { PromptTemplateService } from './modules/promptTemplate/PromptTemplateService';
import { ScannerService } from './modules/scanner/ScannerService';
import type { TServiceApi } from './modules/service/Service';
import { migrateStore } from './modules/service/storeVersioning';
import { SettingsService } from './modules/settings/SettingsService';
import { IPC_HANDLERS_ARGUMENT } from './ipcHandlersArgument';
import type { TPreloadApi } from './preload';

// Every service the renderer can reach. ElectronAPI is derived from this list, so a service or
// handler added here shows up in the renderer's types.
const SERVICES = [
  SettingsService,
  EncryptionService,
  ScannerService,
  ProjectService,
  PromptTemplateService,
  GlossaryService,
  IntegrationsService,
  LmStudioService,
  DeeplService,
  MediaService,
  SpellcheckService,
] as const;

type TServices = (typeof SERVICES)[number];

export type ElectronAPI = {
  readonly [S in TServices as S['serviceName']]: TServiceApi<InstanceType<S>>;
} & TPreloadApi;

const appStore = new Store();
const services = SERVICES.map((ServiceClass) =>
  ServiceClass.initialize(appStore, (channel, listener) =>
    // Each listener declares its own argument types, which ipcMain only knows as any[]
    ipcMain.handle(channel, listener as Parameters<typeof ipcMain.handle>[1])
  )
);
// Awaited before the first window opens
const storeMigration = migrateStore(appStore, services);

// Handler names per service, for preload to build window.electronAPI from
const handlerNames: Record<string, string[]> = Object.fromEntries(
  services.map((service) => [service.name, service.handlers.map(({ name }) => name)])
);

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
      additionalArguments: [`${IPC_HANDLERS_ARGUMENT}${JSON.stringify(handlerNames)}`],
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app
  .whenReady()
  .then(async () => {
    Menu.setApplicationMenu(null);
    await storeMigration;
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  })
  // Without a migrated store there's no window to open; quit rather than linger windowless
  .catch((error: unknown) => {
    dialog.showErrorBox('Marmalatar failed to start', String(error));
    app.exit(1);
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

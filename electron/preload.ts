import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { IPC_HANDLERS_ARGUMENT } from './ipcHandlersArgument';
import {
  MEDIA_BUNDLE_LOST_CHANNEL,
  type TMediaBundleStatus,
} from '../bridge/definitions/mediaBundle';

// What preload adds next to the service handlers
export type TPreloadApi = {
  getPathForFile: (file: File) => string;
  /** Pushed by the media service's health beacon when the tracked video bundle breaks. Returns the
   * unsubscribe. */
  onMediaBundleLost: (listener: (status: TMediaBundleStatus) => void) => () => void;
};

function readHandlerNames(): Record<string, string[]> {
  const argument = process.argv.find((arg) => arg.startsWith(IPC_HANDLERS_ARGUMENT));
  if (!argument) throw new Error('Preload: IPC handler list is missing');
  return JSON.parse(argument.slice(IPC_HANDLERS_ARGUMENT.length)) as Record<string, string[]>;
}

// `{ scanner: { getTrackedFolder: (...args) => invoke('scanner.getTrackedFolder', ...args) } }`.
// Its type is ElectronAPI in electron/main.ts, which src/electron.d.ts declares on window.
const serviceApi = Object.fromEntries(
  Object.entries(readHandlerNames()).map(([serviceName, handlers]) => [
    serviceName,
    Object.fromEntries(
      handlers.map((handler) => [
        handler,
        (...args: unknown[]) => ipcRenderer.invoke(`${serviceName}.${handler}`, ...args),
      ])
    ),
  ])
);

const preloadApi: TPreloadApi = {
  getPathForFile: (file) => webUtils.getPathForFile(file),
  // Only this channel and only its payload reach the renderer -- never ipcRenderer itself
  onMediaBundleLost: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, status: TMediaBundleStatus) =>
      listener(status);
    ipcRenderer.on(MEDIA_BUNDLE_LOST_CHANNEL, handler);
    return () => ipcRenderer.removeListener(MEDIA_BUNDLE_LOST_CHANNEL, handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', { ...serviceApi, ...preloadApi });

import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { IPC_HANDLERS_ARGUMENT } from './ipcHandlersArgument';

// What preload adds next to the service handlers
export type TPreloadApi = {
  getPathForFile: (file: File) => string;
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
};

contextBridge.exposeInMainWorld('electronAPI', { ...serviceApi, ...preloadApi });

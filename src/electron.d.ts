import type { ElectronAPI } from '@bridge/electronAPI';

declare global {
  interface Window {
    // Always set by electron/preload.ts before any renderer code runs -- this app only ever
    // runs inside Electron, so there's no "web" fallback path to type for.
    electronAPI: ElectronAPI;
  }
}

export {};

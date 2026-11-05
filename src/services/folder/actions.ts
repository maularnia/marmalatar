import { IPC } from '@src/services/ipc/IPC';
import { dispatch } from '@store/createApi';
import { pathChanged } from './slice';

// The folder service's operations.

// ── IPC ──────────────────────────────────────────────────────────────────────

async function readTrackedFolder(): Promise<string | null> {
  return IPC.files.getTrackedFolder();
}

async function saveTrackedFolder(folder: string): Promise<void> {
  await IPC.files.setTrackedFolder(folder);
}

// Asks the user for a folder; null when cancelled
export async function pickFolder(): Promise<string | null> {
  return IPC.files.selectFolder();
}

// Video paths live outside the tracked folder, wherever the user picked the video from
export async function checkForeignFileExists(absolutePath: string): Promise<boolean> {
  return IPC.files.checkForeignFileExists(absolutePath);
}

export async function cleanupMediaCache(): Promise<void> {
  await IPC.media.cleanupCache();
}

// Makes the next list read scan the tracked folder again, picking up files changed outside the app
export async function rescanFolder(): Promise<void> {
  await IPC.files.rescan();
}

// ── Folder ───────────────────────────────────────────────────────────────────

// Persists the folder in the main process, then puts it in the store
export async function setTrackedFolder(folder: string): Promise<void> {
  await saveTrackedFolder(folder);
  dispatch(pathChanged(folder));
}

// Puts the folder the main process remembers in the store, and returns it. null when none is set.
export async function loadTrackedFolder(): Promise<string | null> {
  const folder = await readTrackedFolder();
  if (folder) dispatch(pathChanged(folder));
  return folder;
}

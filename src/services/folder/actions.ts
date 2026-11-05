import type { TScanResult } from '@bridge/definitions/scan';
import { IPC } from '@src/services/ipc/IPC';
import { Service } from '@src/services/Service';
import { pathChanged, scanned, setInitialized, setIsBusy } from './slice';

// The folder service's operations. The services that own the folder's files (projects, prompt
// templates, glossaries) import this one, so it can't call them: they subscribe to its scan events
// instead (folder.onScanComplete(...)), and react to folder.pathChanged in their extraReducers.

// ── Scan events ──────────────────────────────────────────────────────────────

type TScanStartListener = () => void | Promise<void>;
type TScanCompleteListener = (scan: TScanResult) => void | Promise<void>;

const scanStartListeners = new Set<TScanStartListener>();
const scanCompleteListeners = new Set<TScanCompleteListener>();

/** Runs before the main process scans the folder; the scan waits for it. Returns an unsubscribe. */
export function onScanStart(listener: TScanStartListener): () => void {
  scanStartListeners.add(listener);
  return () => scanStartListeners.delete(listener);
}

/** Runs with the folder's listing whenever it's (re)loaded; the scan, and the busy state, wait for
 * it. Returns an unsubscribe. */
export function onScanComplete(listener: TScanCompleteListener): () => void {
  scanCompleteListeners.add(listener);
  return () => scanCompleteListeners.delete(listener);
}

// Settled, not all: one consumer failing to refresh doesn't keep the others from doing it
async function emitScanStart(): Promise<void> {
  await Promise.allSettled([...scanStartListeners].map((listener) => listener()));
}

async function emitScanComplete(scan: TScanResult): Promise<void> {
  Service.dispatch(scanned(scan));
  await Promise.allSettled([...scanCompleteListeners].map((listener) => listener(scan)));
}

// ── IPC ──────────────────────────────────────────────────────────────────────

async function readTrackedFolder(): Promise<string | null> {
  return IPC.files.getTrackedFolder();
}

async function saveTrackedFolder(folder: string): Promise<void> {
  await IPC.files.setTrackedFolder(folder);
}

// Asks the user for a folder; null when cancelled
async function selectFolder(): Promise<string | null> {
  return IPC.files.selectFolder();
}

// Video paths live outside the tracked folder, wherever the user picked the video from
export async function checkForeignFileExists(absolutePath: string): Promise<boolean> {
  return IPC.files.checkForeignFileExists(absolutePath);
}

export async function cleanupMediaCache(): Promise<void> {
  await IPC.media.cleanupCache();
}

// ── Folder ───────────────────────────────────────────────────────────────────

// Persists the folder in the main process, then puts it in the store
async function setTrackedFolder(folder: string): Promise<void> {
  await saveTrackedFolder(folder);
  Service.dispatch(pathChanged(folder));
}

// Puts the folder the main process remembers in the store and hands its cached listing to the
// subscribers -- no live scan at startup. Marks the folder initialized either way.
export async function loadTrackedFolder(): Promise<void> {
  try {
    const folder = await readTrackedFolder();
    if (!folder) return;
    Service.dispatch(pathChanged(folder));
    await emitScanComplete(await IPC.files.getScan());
  } finally {
    Service.dispatch(setInitialized(true));
  }
}

async function runScan(): Promise<void> {
  await emitScanStart();
  await emitScanComplete(await IPC.files.rescan());
  // Best-effort housekeeping side effect of scanning -- not awaited (so it can't slow down the
  // scan) and not surfaced as a toast (it isn't a user-initiated action).
  void cleanupMediaCache().catch(() => {});
}

// The only operations that make the main process scan the folder again -- restricted to the two
// explicit user actions (folder select, manual rescan) per design. Anything else reads the cached
// listing, so files changed outside the app show up only after one of these.

export async function scanFolder(): Promise<void> {
  Service.dispatch(setIsBusy(true));
  try {
    await runScan();
  } finally {
    Service.dispatch(setIsBusy(false));
  }
}

// Asks for a folder and switches to it: pathChanged closes whatever belonged to the old one (each
// slice resets itself in its extraReducers), then the new folder is scanned. false when cancelled.
// Open edits aren't saved here: the project autosaves.
export async function pickFolder(): Promise<boolean> {
  Service.dispatch(setIsBusy(true));
  try {
    const selected = await selectFolder();
    if (!selected) return false;
    await setTrackedFolder(selected);
    await runScan();
    return true;
  } finally {
    Service.dispatch(setIsBusy(false));
  }
}

import { api } from '@store/createApi';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IPC } from '@src/services/ipc/IPC';
import type { AppDispatch } from '@store/root';

// The tracked folder only. The project, prompt template and glossary lists live in the slices that
// own those files (project, aiPromptEditor); refreshing all of them at once is in thunks.ts, since
// those slices import this one.

// ── IPC ──────────────────────────────────────────────────────────────────────

async function readTrackedFolder(): Promise<string | null> {
  return IPC.files.getTrackedFolder();
}

async function saveTrackedFolder(folder: string): Promise<void> {
  await IPC.files.setTrackedFolder(folder);
}

async function selectFolderDialog(): Promise<string | null> {
  return IPC.files.selectFolder();
}

// Video paths live outside the tracked folder, wherever the user picked the video from
async function checkForeignFileExists(absolutePath: string): Promise<boolean> {
  return IPC.files.checkForeignFileExists(absolutePath);
}

async function cleanupMediaCache(): Promise<void> {
  await IPC.media.cleanupCache();
}

// Makes the next list read scan the tracked folder again, picking up files changed outside the app
async function rescanFolder(): Promise<void> {
  await IPC.files.rescan();
}

type WorkingFolderState = {
  folder: string | null;
  initialized: boolean;
  isBusy: boolean;
};

const initialState: WorkingFolderState = {
  folder: null,
  initialized: false,
  isBusy: false,
};

const workingFolderSlice = createSlice({
  name: 'workingFolder',
  initialState,
  reducers: {
    // The store's side of a folder change, for other slices to react to. Change the folder with
    // setTrackedFolder, which also persists it in the main process.
    folderChanged(state, action: PayloadAction<string | null>) {
      state.folder = action.payload;
    },
    setInitialized(state, action: PayloadAction<boolean>) {
      state.initialized = action.payload;
    },
    setIsBusy(state, action: PayloadAction<boolean>) {
      state.isBusy = action.payload;
    },
  },
  selectors: {
    selectFolder: (state) => state.folder,
    selectInitialized: (state) => state.initialized,
    selectWorkingFolderIsBusy: (state) => state.isBusy,
  },
});

const { folderChanged, setInitialized, setIsBusy } = workingFolderSlice.actions;

const { selectFolder, selectInitialized, selectWorkingFolderIsBusy } = workingFolderSlice.selectors;

export default workingFolderSlice.reducer;

// ── Thunks ───────────────────────────────────────────────────────────────────

// Persists the folder in the main process, then puts it in the store
const setTrackedFolder =
  (folder: string) =>
  async (dispatch: AppDispatch): Promise<void> => {
    await saveTrackedFolder(folder);
    dispatch(folderChanged(folder));
  };

// Puts the folder the main process remembers in the store, and returns it. null when none is set.
const loadTrackedFolder =
  () =>
  async (dispatch: AppDispatch): Promise<string | null> => {
    const folder = await readTrackedFolder();
    if (folder) dispatch(folderChanged(folder));
    return folder;
  };

// ── API ──────────────────────────────────────────────────────────────────────

export const workingFolder = api('workingFolder', {
  actions: {
    folderChanged,
    setInitialized,
    setIsBusy,
  },
  thunks: {
    loadTrackedFolder,
    setTrackedFolder,
  },
  selectors: {
    selectFolder,
    selectInitialized,
    selectWorkingFolderIsBusy,
  },
  helpers: {
    checkForeignFileExists,
    cleanupMediaCache,
    rescanFolder,
    selectFolderDialog,
  },
});

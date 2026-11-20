import type { TScanResult } from '@bridge/definitions/scan';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// The tracked folder and its file listing. The project, prompt template and glossary lists live in
// the services that own those files: they subscribe to the folder's scan events and refresh
// themselves, and reset on pathChanged, since they import this service and not the other way round.

type FolderState = {
  folder: string | null;
  // The folder's file listing, as the main process last gave it
  files: TScanResult | null;
  initialized: boolean;
  isBusy: boolean;
};

const initialState: FolderState = {
  folder: null,
  files: null,
  initialized: false,
  isBusy: false,
};

const folderSlice = createSlice({
  name: 'folder',
  initialState,
  reducers: {
    // The store's side of a folder change, for other slices to react to. Change the folder with
    // folder.pick or folder.setTracked, which also persist it in the main process.
    pathChanged(state, action: PayloadAction<string | null>) {
      state.folder = action.payload;
      state.files = null;
    },
    scanned(state, action: PayloadAction<TScanResult>) {
      state.files = action.payload;
    },
    setInitialized(state, action: PayloadAction<boolean>) {
      state.initialized = action.payload;
    },
    setIsBusy(state, action: PayloadAction<boolean>) {
      state.isBusy = action.payload;
    },
  },
  selectors: {
    selectFolderPath: (state) => state.folder,
    selectFolderFiles: (state) => state.files,
    selectInitialized: (state) => state.initialized,
    selectFolderIsBusy: (state) => state.isBusy,
  },
});

export const { pathChanged, scanned, setInitialized, setIsBusy } = folderSlice.actions;

export const { selectFolderPath, selectFolderFiles, selectInitialized, selectFolderIsBusy } =
  folderSlice.selectors;

export default folderSlice.reducer;

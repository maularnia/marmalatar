import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// The tracked folder only. The project, prompt template and glossary lists live in the services
// that own those files; refreshing all of them at once is in thunks.ts, since those services import
// this one.

type FolderState = {
  folder: string | null;
  initialized: boolean;
  isBusy: boolean;
};

const initialState: FolderState = {
  folder: null,
  initialized: false,
  isBusy: false,
};

const folderSlice = createSlice({
  name: 'folder',
  initialState,
  reducers: {
    // The store's side of a folder change, for other slices to react to. Change the folder with
    // folder.setTracked, which also persists it in the main process.
    pathChanged(state, action: PayloadAction<string | null>) {
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
    selectFolderPath: (state) => state.folder,
    selectInitialized: (state) => state.initialized,
    selectFolderIsBusy: (state) => state.isBusy,
  },
});

export const { pathChanged, setInitialized, setIsBusy } = folderSlice.actions;

export const { selectFolderPath, selectInitialized, selectFolderIsBusy } = folderSlice.selectors;

export default folderSlice.reducer;

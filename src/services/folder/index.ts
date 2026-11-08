import { Service } from '@src/services/Service';
import {
  checkForeignFileExists,
  cleanupMediaCache,
  loadTrackedFolder,
  onScanComplete,
  onScanStart,
  pickFolder,
  scanFolder,
} from './actions';
import {
  pathChanged,
  selectFolderFiles,
  selectFolderPath,
  selectInitialized,
  selectFolderIsBusy,
  setIsBusy,
} from './slice';

// The folder service: the tracked folder (persisted by the main process) and its file listing,
// whether it has been loaded, and whether a folder-wide operation is running. Picking and scanning
// the folder live here; the services owning its files subscribe with onScanStart/onScanComplete.
// This file is its only entry point: the slice lives in slice.ts, the operations in actions.ts.

export { default as folderReducer } from './slice';

export const folder = new Service('folder', {
  actions: {
    pathChanged,
    setIsBusy,
  },
  selectors: {
    selectFolderFiles,
    selectFolderPath,
    selectInitialized,
    selectFolderIsBusy,
  },
  functions: {
    checkForeignFileExists,
    cleanupMediaCache,
    loadTrackedFolder,
    onScanComplete,
    onScanStart,
    pickFolder,
    scanFolder,
  },
});

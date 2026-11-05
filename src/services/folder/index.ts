import { Service } from '@src/services/Service';
import {
  checkForeignFileExists,
  cleanupMediaCache,
  loadTrackedFolder,
  pickFolder,
  rescanFolder,
  setTrackedFolder,
} from './actions';
import {
  pathChanged,
  selectFolderPath,
  selectInitialized,
  selectFolderIsBusy,
  setInitialized,
  setIsBusy,
} from './slice';

// The folder service: the tracked folder (persisted by the main process), whether it has
// been loaded, and whether a folder-wide operation is running. This file is its only entry point:
// the slice lives in slice.ts, the operations in actions.ts.

export { default as folderReducer } from './slice';

export const folder = new Service('folder', {
  actions: {
    pathChanged,
    setInitialized,
    setIsBusy,
  },
  selectors: {
    selectFolderPath,
    selectInitialized,
    selectFolderIsBusy,
  },
  functions: {
    checkForeignFileExists,
    cleanupMediaCache,
    loadTrackedFolder,
    pickFolder,
    rescanFolder,
    setTrackedFolder,
  },
});

import { folder } from '@src/services/folder';
import { Service } from '@src/services/Service';
import { addToGlobalDictionary, addToProjectDictionary, loadGlobalDictionaries } from './actions';
import {
  selectAvailableDictionaries,
  selectCanAddToProjectDictionary,
  selectGlobalDictionaries,
  selectGlobalDictionary,
  selectIgnoredWords,
  selectProjectDictionaries,
} from './slice';

// The spellcheck service: the user dictionaries (the tracked folder's global ones and the open
// project's own) in its slice, and adding words to them. The checking itself runs in a Web Worker
// shared by every editor (typoClient.ts, spellcheck.worker.ts), which editors use directly.

export { default as spellcheckReducer } from './slice';

export const spellcheck = new Service('spellcheck', {
  selectors: {
    selectAvailableDictionaries,
    selectCanAddToProjectDictionary,
    selectGlobalDictionaries,
    selectGlobalDictionary,
    selectIgnoredWords,
    selectProjectDictionaries,
  },
  functions: {
    addToGlobalDictionary,
    addToProjectDictionary,
    loadGlobalDictionaries,
  },
});

// Global dictionaries are files in the tracked folder: (re)read whenever it's scanned, which
// covers startup and switching folders
folder.onScanComplete(() => loadGlobalDictionaries());

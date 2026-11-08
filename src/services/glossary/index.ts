import { folder } from '@src/services/folder';
import { Service } from '@src/services/Service';
import {
  addGlossaryEntry,
  addGlossaryEntryFromText,
  createGlossary,
  deleteGlossary,
  deleteGlossaryPair,
  focusGlossaryPairInput,
  insertGlossaryPair,
  moveGlossaryPairFocus,
  openGlossaryEditor,
  reconcileGlossarySelectionWithDirection,
  refreshGlossaries,
  refreshResolvedGlossaryEntries,
  registerGlossaryPairInput,
  renameGlossary,
  saveAndCloseGlossary,
  saveGlossary,
  updateGlossaryEmoji,
  updateGlossaryLanguages,
} from './actions';
import {
  closeGlossaryEditor,
  selectCurrentGlossary,
  selectIsGlossaryEditorOpen,
  selectFocusedGlossaryColumn,
  selectFocusedGlossaryPairIndex,
  selectGlossaryData,
  selectGlossaryItems,
  selectResolvedGlossaryEntries,
  selectSelectedGlossaryFileNames,
  setFocusedGlossaryPair,
  setGlossaryData,
  setGlossaryItems,
  setResolvedGlossaryEntries,
  setSelectedGlossaryFileNames,
} from './slice';

// The glossary service: the tracked folder's glossary files, the glossary open in the editor
// overlay (its pairs, and which pair input has focus), and the glossaries the translation uses (the
// selection, and the entries resolved from it for the AI request). This file is its only entry
// point: the slice lives in slice.ts, the operations in actions.ts.

export { default as glossaryReducer } from './slice';
export type { TGlossaryPairColumn } from './slice';

export const glossaries = new Service('glossary', {
  actions: {
    closeGlossaryEditor,
    setFocusedGlossaryPair,
    setGlossaryData,
    setGlossaryItems,
    setResolvedGlossaryEntries,
    setSelectedGlossaryFileNames,
  },
  selectors: {
    selectCurrentGlossary,
    selectIsGlossaryEditorOpen,
    selectFocusedGlossaryColumn,
    selectFocusedGlossaryPairIndex,
    selectGlossaryData,
    selectGlossaryItems,
    selectResolvedGlossaryEntries,
    selectSelectedGlossaryFileNames,
  },
  functions: {
    addGlossaryEntry,
    addGlossaryEntryFromText,
    createGlossary,
    deleteGlossary,
    deleteGlossaryPair,
    focusGlossaryPairInput,
    insertGlossaryPair,
    moveGlossaryPairFocus,
    openGlossaryEditor,
    reconcileGlossarySelectionWithDirection,
    refreshGlossaries,
    refreshResolvedGlossaryEntries,
    registerGlossaryPairInput,
    renameGlossary,
    saveAndCloseGlossary,
    saveGlossary,
    updateGlossaryEmoji,
    updateGlossaryLanguages,
  },
});

// The folder can't import this service, so it hands every listing over through its scan event
folder.onScanComplete(() => refreshGlossaries());

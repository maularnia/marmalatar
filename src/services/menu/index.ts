import { api } from '@store/createApi';
import {
  cancelCreatingGlossary,
  cancelCreatingPromptTemplate,
  deleteFocusedItem,
  deleteGlossary,
  deleteProject,
  deletePromptTemplate,
  focusMenuItem,
  moveMenuFocus,
  openFocusedItem,
  openGlossary,
  openProject,
  openPromptTemplate,
  registerMenuItem,
  renameFocusedItem,
  startNewProject,
  startRenaming,
  stopRenaming,
} from './actions';
import {
  selectIsMenuCompact,
  selectIsMenuDynamic,
  setMenuFocusWithin,
  setMenuPointerOutside,
  selectIsCreatingGlossary,
  selectIsCreatingPromptTemplate,
  selectMenuRenamingKey,
  setIsCreatingGlossary,
  setIsCreatingPromptTemplate,
} from './slice';

// The menu service: the sidebar's items (projects, prompt templates, glossaries, Settings and the
// Create buttons), their keyboard navigation, rename, and opening, creating and deleting from the
// menu. This file is its only entry point: the slice lives in slice.ts, the operations in
// actions.ts.

export { default as menuReducer } from './slice';
export {
  CREATE_GLOSSARY_KEY,
  CREATE_PROJECT_KEY,
  CREATE_PROMPT_TEMPLATE_KEY,
  SETTINGS_KEY,
} from './actions';

export const menu = api('menu', {
  actions: {
    setIsCreatingGlossary,
    setIsCreatingPromptTemplate,
    setMenuFocusWithin,
    setMenuPointerOutside,
  },
  selectors: {
    selectIsCreatingGlossary,
    selectIsCreatingPromptTemplate,
    selectIsMenuCompact,
    selectIsMenuDynamic,
    selectMenuRenamingKey,
  },
  functions: {
    cancelCreatingGlossary,
    cancelCreatingPromptTemplate,
    deleteFocusedItem,
    deleteGlossary,
    deleteProject,
    deletePromptTemplate,
    focusMenuItem,
    moveMenuFocus,
    openFocusedItem,
    openGlossary,
    openProject,
    openPromptTemplate,
    registerMenuItem,
    renameFocusedItem,
    startNewProject,
    startRenaming,
    stopRenaming,
  },
});

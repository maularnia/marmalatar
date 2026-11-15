import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TScreenSize } from '@src/theme/types';
import { settings } from '@src/services/settings';
import { glossaries } from '@src/services/glossary';
import { projects } from '@src/services/project';
import { promptTemplates } from '@src/services/prompt';

// The sidebar menu's state: which item is being renamed, whether a new prompt template or glossary
// is being named, and what decides whether the sidebar is collapsed. Which item has focus isn't
// here: it's read live from the DOM (see actions.ts).
type MenuState = {
  renamingKey: string | null;
  isCreatingPromptTemplate: boolean;
  isCreatingGlossary: boolean;
  // On medium and small screens the sidebar collapses to icons while the pointer is outside it
  isPointerOutside: boolean;
  hasFocusWithin: boolean;
};

const initialState: MenuState = {
  renamingKey: null,
  isCreatingPromptTemplate: false,
  isCreatingGlossary: false,
  isPointerOutside: true,
  hasFocusWithin: false,
};

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    setMenuRenamingKey(state, action: PayloadAction<string | null>) {
      state.renamingKey = action.payload;
    },
    // Stops renaming `key` only -- another item may have started renaming meanwhile
    menuRenamingStopped(state, action: PayloadAction<string>) {
      if (state.renamingKey === action.payload) state.renamingKey = null;
    },
    setIsCreatingPromptTemplate(state, action: PayloadAction<boolean>) {
      state.isCreatingPromptTemplate = action.payload;
    },
    setIsCreatingGlossary(state, action: PayloadAction<boolean>) {
      state.isCreatingGlossary = action.payload;
    },
    setMenuPointerOutside(state, action: PayloadAction<boolean>) {
      state.isPointerOutside = action.payload;
    },
    setMenuFocusWithin(state, action: PayloadAction<boolean>) {
      state.hasFocusWithin = action.payload;
    },
  },
  selectors: {
    selectMenuRenamingKey: (state) => state.renamingKey,
    selectIsCreatingPromptTemplate: (state) => state.isCreatingPromptTemplate,
    selectIsCreatingGlossary: (state) => state.isCreatingGlossary,
  },
});

export const {
  setMenuRenamingKey,
  menuRenamingStopped,
  setIsCreatingPromptTemplate,
  setIsCreatingGlossary,
  setMenuPointerOutside,
  setMenuFocusWithin,
} = menuSlice.actions;

export const { selectMenuRenamingKey, selectIsCreatingPromptTemplate, selectIsCreatingGlossary } =
  menuSlice.selectors;

// These also read other services' state (screen size, open overlays), so they take the root state
// rather than being slice selectors. None of those services imports the menu, so no cycle.
type TMenuRootState = Parameters<typeof settings.selectScreenSize>[0] &
  Parameters<typeof projects.selectIsArchiveOpen>[0] &
  Parameters<typeof projects.selectIsOpen>[0] &
  Parameters<typeof promptTemplates.selectIsEditorOpen>[0] &
  Parameters<typeof glossaries.selectIsEditorOpen>[0] & { menu: MenuState };

/** Whether one of the app's overlays is open. Overlays sit right of the expanded sidebar, so the
 * sidebar stays expanded under them. */
export function selectIsMenuOverlayOpen(state: TMenuRootState): boolean {
  return (
    settings.selectIsOpen(state) ||
    settings.selectIsExportOpen(state) ||
    projects.selectIsArchiveOpen(state) ||
    promptTemplates.selectIsEditorOpen(state) ||
    glossaries.selectIsEditorOpen(state)
  );
}

/** Medium and small screens, with a project open (the editor): the sidebar collapses to icons
 * instead of always being expanded. Without a project -- every other view -- it stays expanded as a
 * column, whatever the screen size. */
export function selectIsMenuDynamic(state: TMenuRootState): boolean {
  const screenSize = settings.selectScreenSize(state);
  return (
    projects.selectIsOpen(state) &&
    (screenSize === TScreenSize.MEDIUM || screenSize === TScreenSize.SMALL)
  );
}

/** Whether the sidebar shows icons only. It stays expanded while the pointer is over it, while an
 * item has focus or a rename/create is in progress -- collapsing out from under a focused or
 * editable row would be disorienting -- and while an overlay is open next to it. */
export function selectIsMenuCompact(state: TMenuRootState): boolean {
  const { isPointerOutside, hasFocusWithin, renamingKey, isCreatingPromptTemplate } = state.menu;
  const isHeldOpen =
    hasFocusWithin ||
    renamingKey != null ||
    isCreatingPromptTemplate ||
    state.menu.isCreatingGlossary;
  return (
    isPointerOutside && selectIsMenuDynamic(state) && !isHeldOpen && !selectIsMenuOverlayOpen(state)
  );
}

export default menuSlice.reducer;

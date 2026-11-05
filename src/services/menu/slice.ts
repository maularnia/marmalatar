import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TScreenSize } from '@src/theme/types';
import { settings } from '@src/services/settings';

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

// These also read the screen size from settings, so they take the root state rather than being
// slice selectors.
type TMenuRootState = Parameters<typeof settings.selectScreenSize>[0] & { menu: MenuState };

/** Medium and small screens: the sidebar collapses to icons instead of always being expanded. */
export function selectIsMenuDynamic(state: TMenuRootState): boolean {
  const screenSize = settings.selectScreenSize(state);
  return screenSize === TScreenSize.MEDIUM || screenSize === TScreenSize.SMALL;
}

/** Whether the sidebar shows icons only. It stays expanded while the pointer is over it, and while
 * an item has focus or a rename/create is in progress -- collapsing out from under a focused or
 * editable row would be disorienting. */
export function selectIsMenuCompact(state: TMenuRootState): boolean {
  const { isPointerOutside, hasFocusWithin, renamingKey, isCreatingPromptTemplate } = state.menu;
  const isHeldOpen =
    hasFocusWithin ||
    renamingKey != null ||
    isCreatingPromptTemplate ||
    state.menu.isCreatingGlossary;
  return isPointerOutside && selectIsMenuDynamic(state) && !isHeldOpen;
}

export default menuSlice.reducer;

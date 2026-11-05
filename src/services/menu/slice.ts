import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// The sidebar menu's editing state: which item is being renamed, and whether a new prompt template
// or glossary is being named. Focus isn't here: it's read live from the DOM (see actions.ts).
type MenuState = {
  renamingKey: string | null;
  isCreatingPromptTemplate: boolean;
  isCreatingGlossary: boolean;
};

const initialState: MenuState = {
  renamingKey: null,
  isCreatingPromptTemplate: false,
  isCreatingGlossary: false,
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
} = menuSlice.actions;

export const { selectMenuRenamingKey, selectIsCreatingPromptTemplate, selectIsCreatingGlossary } =
  menuSlice.selectors;

export default menuSlice.reducer;

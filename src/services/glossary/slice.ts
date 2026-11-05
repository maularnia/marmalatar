import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { type AIGlossaryFileDataType, type TGlossaryEntry } from '@src/utils/data/schemas';
import { overlays, TOverlay } from '@store/slices/overlays';

// Everything about glossaries in one place: the tracked folder's glossary files, the glossary open
// in the editor overlay (its pairs, which pair input has focus), and the glossaries the translation
// uses (the selection, and the entries resolved from it for the AI request).

export type TGlossaryPairColumn = 'original' | 'translation';

type GlossaryState = {
  // The tracked folder's glossaries, as the main process lists them
  glossaryItems: TGlossaryEntry[];
  // The glossary open in the editor overlay
  currentGlossary: string | null;
  glossaryData: AIGlossaryFileDataType | null;
  focusedPairIndex: number | null;
  focusedColumn: TGlossaryPairColumn | null;
  // The glossaries the translation uses, and the entries resolved from them for the AI request
  selectedGlossaryFileNames: string[];
  resolvedGlossaryEntries: [string, string][];
};

const initialState: GlossaryState = {
  glossaryItems: [],
  currentGlossary: null,
  glossaryData: null,
  focusedPairIndex: null,
  focusedColumn: null,
  selectedGlossaryFileNames: [],
  resolvedGlossaryEntries: [],
};

function clearEditor(state: GlossaryState): void {
  state.currentGlossary = null;
  state.glossaryData = null;
  state.focusedPairIndex = null;
  state.focusedColumn = null;
}

const glossarySlice = createSlice({
  name: 'glossary',
  initialState,
  reducers: {
    setGlossaryItems(state, action: PayloadAction<TGlossaryEntry[]>) {
      state.glossaryItems = action.payload;
    },
    // A different glossary has no focused pair yet
    setCurrentGlossary(state, action: PayloadAction<string | null>) {
      if (state.currentGlossary !== action.payload) {
        state.focusedPairIndex = null;
        state.focusedColumn = null;
      }
      state.currentGlossary = action.payload;
    },
    setGlossaryData(state, action: PayloadAction<AIGlossaryFileDataType | null>) {
      state.glossaryData = action.payload;
    },
    closeGlossaryEditor(state) {
      clearEditor(state);
    },
    setFocusedGlossaryPair(
      state,
      action: PayloadAction<{ pairIndex: number | null; column?: TGlossaryPairColumn | null }>
    ) {
      state.focusedPairIndex = action.payload.pairIndex;
      if (action.payload.column !== undefined) state.focusedColumn = action.payload.column;
    },
    // The resolved entries belong to the previous selection, so they're dropped until resolved again
    setSelectedGlossaryFileNames(state, action: PayloadAction<string[]>) {
      state.selectedGlossaryFileNames = action.payload;
      state.resolvedGlossaryEntries = [];
    },
    setResolvedGlossaryEntries(state, action: PayloadAction<[string, string][]>) {
      state.resolvedGlossaryEntries = action.payload;
    },
  },
  extraReducers(builder) {
    // Opening another overlay, or closing them all, closes the glossary editor. The prompt
    // template editor does the same on its side, so neither slice has to reach into the other.
    builder.addCase(overlays.closeAll, clearEditor);
    builder.addCase(overlays.setCurrent, (state, action) => {
      if (action.payload !== TOverlay.GLOSSARY) clearEditor(state);
    });
  },
  selectors: {
    selectGlossaryItems: (state) => state.glossaryItems,
    selectCurrentGlossary: (state) => state.currentGlossary,
    selectGlossaryData: (state) => state.glossaryData,
    selectFocusedGlossaryPairIndex: (state) => state.focusedPairIndex,
    selectFocusedGlossaryColumn: (state) => state.focusedColumn,
    selectSelectedGlossaryFileNames: (state) => state.selectedGlossaryFileNames,
    selectResolvedGlossaryEntries: (state) => state.resolvedGlossaryEntries,
  },
});

export const {
  setGlossaryItems,
  setCurrentGlossary,
  setGlossaryData,
  closeGlossaryEditor,
  setFocusedGlossaryPair,
  setSelectedGlossaryFileNames,
  setResolvedGlossaryEntries,
} = glossarySlice.actions;

export const {
  selectGlossaryItems,
  selectCurrentGlossary,
  selectGlossaryData,
  selectFocusedGlossaryPairIndex,
  selectFocusedGlossaryColumn,
  selectSelectedGlossaryFileNames,
  selectResolvedGlossaryEntries,
} = glossarySlice.selectors;

export default glossarySlice.reducer;

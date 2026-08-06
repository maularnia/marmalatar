import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type PromptState = {
  frozenLineNumbers: number[];
  selectedPromptTemplateFileName: string | null;
  selectedGlossaryFileNames: string[];
};

const initialState: PromptState = {
  frozenLineNumbers: [],
  selectedPromptTemplateFileName: null,
  selectedGlossaryFileNames: [],
};

const promptSlice = createSlice({
  name: 'prompt',
  initialState,
  reducers: {
    setFrozenLineNumbers(state, action: PayloadAction<number[]>) {
      state.frozenLineNumbers = action.payload;
    },
    addFrozenLine(state, action: PayloadAction<number>) {
      if (!state.frozenLineNumbers.includes(action.payload)) {
        state.frozenLineNumbers.push(action.payload);
      }
    },
    removeFrozenLine(state, action: PayloadAction<number>) {
      state.frozenLineNumbers = state.frozenLineNumbers.filter((no) => no !== action.payload);
    },
    setSelectedPromptTemplateFileName(state, action: PayloadAction<string | null>) {
      state.selectedPromptTemplateFileName = action.payload;
    },
    setSelectedGlossaryFileNames(state, action: PayloadAction<string[]>) {
      state.selectedGlossaryFileNames = action.payload;
    },
    resetPromptState(): PromptState {
      return initialState;
    },
  },
  selectors: {
    selectFrozenLineNumbers: (state) => state.frozenLineNumbers,
    selectSelectedPromptTemplateFileName: (state) => state.selectedPromptTemplateFileName,
    selectSelectedGlossaryFileNames: (state) => state.selectedGlossaryFileNames,
  },
});

export const {
  setFrozenLineNumbers,
  addFrozenLine,
  removeFrozenLine,
  setSelectedPromptTemplateFileName,
  setSelectedGlossaryFileNames,
  resetPromptState,
} = promptSlice.actions;

export default promptSlice.reducer;

export const {
  selectFrozenLineNumbers,
  selectSelectedPromptTemplateFileName,
  selectSelectedGlossaryFileNames,
} = promptSlice.selectors;

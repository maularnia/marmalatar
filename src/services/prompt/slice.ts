import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { TPromptTemplateListEntry } from '@bridge/definitions/promptTemplateEntry';
import type { PromptTemplateFileDataType } from '@src/utils/data/schemas';
import { overlays, TOverlay } from '@store/slices/overlays';

export type TPromptTemplateEntry = TPromptTemplateListEntry;

type PromptState = {
  // The tracked folder's prompt templates, as the main process lists them
  promptTemplateItems: TPromptTemplateEntry[];
  // The prompt template open in the editor overlay
  currentPromptTemplate: string | null;
  promptTemplateData: PromptTemplateFileDataType | null;
  // The prompt template the translation uses
  selectedPromptTemplateFileName: string | null;
};

const initialState: PromptState = {
  promptTemplateItems: [],
  currentPromptTemplate: null,
  promptTemplateData: null,
  selectedPromptTemplateFileName: null,
};

function clearEditor(state: PromptState): void {
  state.currentPromptTemplate = null;
  state.promptTemplateData = null;
}

const promptSlice = createSlice({
  name: 'prompt',
  initialState,
  reducers: {
    setPromptTemplateItems(state, action: PayloadAction<TPromptTemplateEntry[]>) {
      state.promptTemplateItems = action.payload;
    },
    setCurrentPromptTemplate(state, action: PayloadAction<string | null>) {
      state.currentPromptTemplate = action.payload;
    },
    setPromptTemplateData(state, action: PayloadAction<PromptTemplateFileDataType | null>) {
      state.promptTemplateData = action.payload;
    },
    closePromptTemplateEditor(state) {
      clearEditor(state);
    },
    setSelectedPromptTemplateFileName(state, action: PayloadAction<string | null>) {
      state.selectedPromptTemplateFileName = action.payload;
    },
  },
  extraReducers(builder) {
    // Opening another overlay, or closing them all, closes the prompt template editor. The glossary
    // editor does the same on its side, so neither slice has to reach into the other.
    builder.addCase(overlays.closeAll, clearEditor);
    builder.addCase(overlays.setCurrent, (state, action) => {
      if (action.payload !== TOverlay.PROMPT_TEMPLATE) clearEditor(state);
    });
  },
  selectors: {
    selectPromptTemplateItems: (state) => state.promptTemplateItems,
    selectCurrentPromptTemplate: (state) => state.currentPromptTemplate,
    selectPromptTemplateData: (state) => state.promptTemplateData,
    selectSelectedPromptTemplateFileName: (state) => state.selectedPromptTemplateFileName,
  },
});

export const {
  setPromptTemplateItems,
  setCurrentPromptTemplate,
  setPromptTemplateData,
  closePromptTemplateEditor,
  setSelectedPromptTemplateFileName,
} = promptSlice.actions;

export const {
  selectPromptTemplateItems,
  selectCurrentPromptTemplate,
  selectPromptTemplateData,
  selectSelectedPromptTemplateFileName,
} = promptSlice.selectors;

export default promptSlice.reducer;

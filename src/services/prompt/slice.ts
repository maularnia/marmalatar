import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { TPromptTemplateListEntry } from '@bridge/definitions/promptTemplateEntry';
import type { PromptTemplateFileDataType } from '@src/utils/data/schemas';

export type TPromptTemplateEntry = TPromptTemplateListEntry;

type PromptState = {
  // The tracked folder's prompt templates, as the main process lists them
  promptTemplateItems: TPromptTemplateEntry[];
  // The prompt template open in the editor overlay; the overlay is open while it's set
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
    // A template's body was written to its file. Changes nothing here: it's for services that keep
    // a copy of a template to react to (the ai service, for the one the translation uses), since
    // this service can't import them.
    templateSaved(
      _state,
      _action: PayloadAction<{
        fileName: string;
        data: PromptTemplateFileDataType;
        isSelected: boolean;
      }>
    ) {},
  },
  selectors: {
    selectPromptTemplateItems: (state) => state.promptTemplateItems,
    selectCurrentPromptTemplate: (state) => state.currentPromptTemplate,
    selectIsPromptTemplateEditorOpen: (state) => state.currentPromptTemplate !== null,
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
  templateSaved,
} = promptSlice.actions;

export const {
  selectPromptTemplateItems,
  selectCurrentPromptTemplate,
  selectIsPromptTemplateEditorOpen,
  selectPromptTemplateData,
  selectSelectedPromptTemplateFileName,
} = promptSlice.selectors;

export default promptSlice.reducer;

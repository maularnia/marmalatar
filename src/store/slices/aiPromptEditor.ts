import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { PromptTemplateFileDataType, AIGlossaryFileDataType } from '@src/utils/data/schemas';
import { setSelectedGlossaryFileNames } from '@store/slices/prompt';
import { closeOverlays } from '@store/slices/overlays';

type AiPromptEditorState = {
  currentPromptTemplate: string | null;
  promptTemplateData: PromptTemplateFileDataType | null;
  currentGlossary: string | null;
  glossaryData: AIGlossaryFileDataType | null;
  resolvedGlossaryEntries: [string, string][];
};

const initialState: AiPromptEditorState = {
  currentPromptTemplate: null,
  promptTemplateData: null,
  currentGlossary: null,
  glossaryData: null,
  resolvedGlossaryEntries: [],
};

const aiPromptEditorSlice = createSlice({
  name: 'aiPromptEditor',
  initialState,
  reducers: {
    setCurrentPromptTemplate(state, action: PayloadAction<string | null>) {
      state.currentPromptTemplate = action.payload;
    },
    setPromptTemplateData(state, action: PayloadAction<PromptTemplateFileDataType | null>) {
      state.promptTemplateData = action.payload;
    },
    setCurrentGlossary(state, action: PayloadAction<string | null>) {
      state.currentGlossary = action.payload;
    },
    setGlossaryData(state, action: PayloadAction<AIGlossaryFileDataType | null>) {
      state.glossaryData = action.payload;
    },
    setResolvedGlossaryEntries(state, action: PayloadAction<[string, string][]>) {
      state.resolvedGlossaryEntries = action.payload;
    },
    // Resets the editor's own scratch state only -- resolvedGlossaryEntries is the active
    // translation-time glossary cache, not scratch editor state, and is deliberately preserved
    // here (dispatched from opening Settings/Export and switching/deleting projects, none of
    // which should invalidate a glossary resolution that's still valid).
    resetAiPromptEditor(state): AiPromptEditorState {
      return { ...initialState, resolvedGlossaryEntries: state.resolvedGlossaryEntries };
    },
  },
  extraReducers(builder) {
    builder.addCase(closeOverlays, (state) => {
      state.promptTemplateData = null;
      state.glossaryData = null;
      state.currentPromptTemplate = null;
      state.currentGlossary = null;
    });
    builder.addCase(setSelectedGlossaryFileNames, (state) => {
      state.resolvedGlossaryEntries = [];
    });
  },
  selectors: {
    selectCurrentPromptTemplate: (state) => state.currentPromptTemplate,
    selectPromptTemplateData: (state) => state.promptTemplateData,
    selectCurrentGlossary: (state) => state.currentGlossary,
    selectGlossaryData: (state) => state.glossaryData,
    selectResolvedGlossaryEntries: (state) => state.resolvedGlossaryEntries,
  },
});

export const {
  setCurrentPromptTemplate,
  setPromptTemplateData,
  setCurrentGlossary,
  setGlossaryData,
  setResolvedGlossaryEntries,
  resetAiPromptEditor,
} = aiPromptEditorSlice.actions;

export const {
  selectCurrentPromptTemplate,
  selectPromptTemplateData,
  selectCurrentGlossary,
  selectGlossaryData,
  selectResolvedGlossaryEntries,
} = aiPromptEditorSlice.selectors;

export default aiPromptEditorSlice.reducer;

import { api } from '@store/createApi';
import {
  createPromptTemplate,
  deletePromptTemplate,
  openPromptTemplateEditor,
  readPromptTemplateFile,
  refreshPromptTemplates,
  renamePromptTemplate,
  updatePromptTemplateEmoji,
  writePromptTemplateBody,
} from './actions';
import {
  closePromptTemplateEditor,
  selectCurrentPromptTemplate,
  selectPromptTemplateData,
  selectPromptTemplateItems,
  selectSelectedPromptTemplateFileName,
  setPromptTemplateData,
  setPromptTemplateItems,
  setSelectedPromptTemplateFileName,
} from './slice';

// The prompt service: the tracked folder's prompt template files, the template open in the editor
// overlay, and the template the translation uses. This file is its only entry point: the slice
// lives in slice.ts, the operations in actions.ts.

export { default as promptReducer } from './slice';

export const promptTemplates = api('promptTemplate', {
  actions: {
    closePromptTemplateEditor,
    setPromptTemplateData,
    setPromptTemplateItems,
    setSelectedPromptTemplateFileName,
  },
  selectors: {
    selectCurrentPromptTemplate,
    selectPromptTemplateData,
    selectPromptTemplateItems,
    selectSelectedPromptTemplateFileName,
  },
  functions: {
    createPromptTemplate,
    deletePromptTemplate,
    openPromptTemplateEditor,
    readPromptTemplateFile,
    refreshPromptTemplates,
    renamePromptTemplate,
    updatePromptTemplateEmoji,
    writePromptTemplateBody,
  },
});

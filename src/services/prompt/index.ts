import { folder } from '@src/services/folder';
import { Service } from '@src/services/Service';
import {
  createPromptTemplate,
  deletePromptTemplate,
  openPromptTemplateEditor,
  readPromptTemplateFile,
  refreshPromptTemplates,
  renamePromptTemplate,
  saveAndClosePromptTemplate,
  savePromptTemplate,
  updatePromptTemplateEmoji,
  writePromptTemplateBody,
} from './actions';
import {
  closePromptTemplateEditor,
  selectCurrentPromptTemplate,
  selectIsPromptTemplateEditorOpen,
  selectPromptTemplateData,
  selectPromptTemplateItems,
  selectSelectedPromptTemplateFileName,
  setPromptTemplateData,
  setPromptTemplateItems,
  setSelectedPromptTemplateFileName,
  templateSaved,
} from './slice';

// The prompt service: the tracked folder's prompt template files, the template open in the editor
// overlay, and the template the translation uses. This file is its only entry point: the slice
// lives in slice.ts, the operations in actions.ts.

export { default as promptReducer } from './slice';

export const promptTemplates = new Service('promptTemplate', {
  actions: {
    closePromptTemplateEditor,
    setPromptTemplateData,
    setPromptTemplateItems,
    setSelectedPromptTemplateFileName,
    templateSaved,
  },
  selectors: {
    selectCurrentPromptTemplate,
    selectIsPromptTemplateEditorOpen,
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
    saveAndClosePromptTemplate,
    savePromptTemplate,
    updatePromptTemplateEmoji,
    writePromptTemplateBody,
  },
});

// The folder can't import this service, so it hands every listing over through its scan event
folder.onScanComplete(() => refreshPromptTemplates());

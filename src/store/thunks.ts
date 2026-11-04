import type { AppDispatch, RootState } from './root';
import {
  resetAiPromptEditor,
  saveGlossary,
  selectCurrentGlossary,
  selectCurrentPromptTemplate,
  writePromptTemplateBody,
} from './slices/aiPromptEditor';
import { refreshSelectedPromptTemplateData } from './slices/aiTranslation';
import {
  forceRescan,
  refreshPromptTemplates,
  selectFolder,
  selectFolderDialog,
  setFolder,
  setIsBusy,
  setTrackedFolder,
} from './slices/disc';
import { resetEditorMemoryState } from './slices/editor';
import {
  closeOverlays,
  selectCurrentOverlay,
  setCurrentOverlay,
  TOverlay,
} from './slices/overlays';
import { resetProject, saveProjectToDisk, selectIsProjectOpen } from './slices/project';
import { resetPromptState, selectSelectedPromptTemplateFileName } from './slices/prompt';

// Thunks that span slices which import each other, so they can't live in either slice file
// without an import cycle.

// ── AI Prompt Template ──────────────────────────────────────────────────────

// Lives here because it refreshes the translation's selected template (aiTranslation), and the
// aiTranslation slice imports aiPromptEditor
export const savePromptTemplate =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const { currentPromptTemplate, promptTemplateData } = state.aiPromptEditor;
    const folder = selectFolder(state);
    if (!currentPromptTemplate || !folder || !promptTemplateData) return;
    await writePromptTemplateBody(currentPromptTemplate, promptTemplateData);
    await dispatch(refreshPromptTemplates());
    if (selectSelectedPromptTemplateFileName(state) === currentPromptTemplate) {
      void dispatch(refreshSelectedPromptTemplateData());
    }
  };

// ── Overlays ────────────────────────────────────────────────────────────────

// Here rather than in the overlays slice: they reset aiPromptEditor, which imports overlays

export const openSettingsOverlay =
  () =>
  (dispatch: AppDispatch): void => {
    dispatch(resetAiPromptEditor());
    dispatch(setCurrentOverlay(TOverlay.SETTINGS));
  };

export const openExportOverlay =
  () =>
  (dispatch: AppDispatch): void => {
    dispatch(resetAiPromptEditor());
    dispatch(setCurrentOverlay(TOverlay.EXPORT));
  };

// ── Folder ──────────────────────────────────────────────────────────────────

// Saves whatever is open in every slice before switching folders

export const pickFolder =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<boolean> => {
    dispatch(setIsBusy(true));
    try {
      const selected = await selectFolderDialog();
      if (!selected) return false;

      const state = getState();
      if (selectIsProjectOpen(state)) {
        await dispatch(saveProjectToDisk());
      }

      const currentOverlay = selectCurrentOverlay(state);
      if (currentOverlay === TOverlay.PROMPT_TEMPLATE && selectCurrentPromptTemplate(state)) {
        await dispatch(savePromptTemplate());
      } else if (currentOverlay === TOverlay.GLOSSARY && selectCurrentGlossary(state)) {
        await dispatch(saveGlossary());
      }

      await setTrackedFolder(selected);
      dispatch(setFolder(selected));

      dispatch(resetEditorMemoryState());
      dispatch(closeOverlays());
      dispatch(resetProject());
      dispatch(resetPromptState());
      dispatch(resetAiPromptEditor());

      await dispatch(forceRescan());
      return true;
    } finally {
      dispatch(setIsBusy(false));
    }
  };

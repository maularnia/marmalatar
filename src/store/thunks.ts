import type { AppDispatch, RootState } from './root';
import {
  refreshGlossaries,
  refreshPromptTemplates,
  resetAiPromptEditor,
  saveGlossary,
  selectCurrentGlossary,
  selectCurrentPromptTemplate,
  setGlossaryItems,
  setPromptTemplateItems,
  writePromptTemplateBody,
} from './slices/aiPromptEditor';
import { refreshSelectedPromptTemplateData } from './slices/aiTranslation';
import {
  cleanupMediaCache,
  getTrackedFolder,
  rescanFolder,
  selectFolder,
  selectFolderDialog,
  setFolder,
  setInitialized,
  setIsBusy,
  setTrackedFolder,
} from './slices/workingFolder';
import { resetEditorMemoryState } from './slices/editor';
import {
  closeOverlays,
  selectCurrentOverlay,
  setCurrentOverlay,
  TOverlay,
} from './slices/overlays';
import {
  refreshProjects,
  resetProject,
  saveProjectToDisk,
  selectIsProjectOpen,
  setProjects,
} from './slices/project';
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

// The folder's lists live in the slices that own the files (project, aiPromptEditor), and those
// import the workingFolder slice, so refreshing them all together has to happen here
const refreshAll =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    if (!selectFolder(getState())) {
      dispatch(setProjects([]));
      dispatch(setPromptTemplateItems([]));
      dispatch(setGlossaryItems([]));
      return;
    }
    await Promise.all([
      dispatch(refreshProjects()),
      dispatch(refreshPromptTemplates()),
      dispatch(refreshGlossaries()),
    ]);
  };

// The only thunk that makes the main process scan the folder again -- restricted to the two
// explicit user actions (folder select, manual rescan) per design. Anything else reads the cached
// listing, so files changed outside the app show up only after one of these.
export const forceRescan =
  () =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(setIsBusy(true));
    try {
      await rescanFolder();
      await dispatch(refreshAll());
      // Best-effort housekeeping side effect of scanning -- not awaited (so it can't slow down the
      // scan) and not surfaced as a toast (it isn't a user-initiated action).
      void cleanupMediaCache().catch(() => {});
    } finally {
      dispatch(setIsBusy(false));
    }
  };

export const initWorkingFolder =
  () =>
  async (dispatch: AppDispatch): Promise<void> => {
    try {
      const savedFolder = await getTrackedFolder();
      if (!savedFolder) return;
      dispatch(setFolder(savedFolder));
      // The main process keeps the last listing, so no live scan is needed at startup
      await dispatch(refreshAll());
    } finally {
      dispatch(setInitialized(true));
    }
  };

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

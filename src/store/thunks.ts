import type { AppDispatch, RootState } from './root';
import { aiPromptEditor, glossaries, promptTemplates } from './slices/aiPromptEditor';
import { ai } from './slices/ai';
import { workingFolder } from './slices/workingFolder';
import { editor } from './slices/editor';
import { TOverlay } from './slices/overlays';
import { overlays } from './slices/overlays';
import { projects } from './slices/project';
import { prompt } from './slices/prompt';

// Thunks that span slices which import each other, so they can't live in either slice file
// without an import cycle.

// ── AI Prompt Template ──────────────────────────────────────────────────────

// Lives here because it refreshes the translation's selected template (the ai slice), and the
// ai slice imports aiPromptEditor
export const savePromptTemplate =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const { currentPromptTemplate, promptTemplateData } = state.aiPromptEditor;
    const folder = workingFolder.selectFolder(state);
    if (!currentPromptTemplate || !folder || !promptTemplateData) return;
    await promptTemplates.writeBody(currentPromptTemplate, promptTemplateData);
    await dispatch(promptTemplates.refresh());
    if (prompt.selectSelectedPromptTemplateFileName(state) === currentPromptTemplate) {
      void dispatch(ai.refreshSelectedPromptTemplateData());
    }
  };

// ── Overlays ────────────────────────────────────────────────────────────────

// Here rather than in the overlays slice: they reset aiPromptEditor, which imports overlays

export const openSettingsOverlay =
  () =>
  (dispatch: AppDispatch): void => {
    dispatch(aiPromptEditor.reset());
    dispatch(overlays.setCurrent(TOverlay.SETTINGS));
  };

export const openExportOverlay =
  () =>
  (dispatch: AppDispatch): void => {
    dispatch(aiPromptEditor.reset());
    dispatch(overlays.setCurrent(TOverlay.EXPORT));
  };

// ── Folder ──────────────────────────────────────────────────────────────────

// The folder's lists live in the slices that own the files (project, aiPromptEditor), and those
// import the workingFolder slice, so refreshing them all together has to happen here
const refreshAll =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    if (!workingFolder.selectFolder(getState())) {
      dispatch(projects.setList([]));
      dispatch(promptTemplates.setItems([]));
      dispatch(glossaries.setItems([]));
      return;
    }
    await Promise.all([
      dispatch(projects.refresh()),
      dispatch(promptTemplates.refresh()),
      dispatch(glossaries.refresh()),
    ]);
  };

// The only thunk that makes the main process scan the folder again -- restricted to the two
// explicit user actions (folder select, manual rescan) per design. Anything else reads the cached
// listing, so files changed outside the app show up only after one of these.
export const forceRescan =
  () =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(workingFolder.setIsBusy(true));
    try {
      await workingFolder.rescanFolder();
      await dispatch(refreshAll());
      // Best-effort housekeeping side effect of scanning -- not awaited (so it can't slow down the
      // scan) and not surfaced as a toast (it isn't a user-initiated action).
      void workingFolder.cleanupMediaCache().catch(() => {});
    } finally {
      dispatch(workingFolder.setIsBusy(false));
    }
  };

export const initWorkingFolder =
  () =>
  async (dispatch: AppDispatch): Promise<void> => {
    try {
      const savedFolder = await dispatch(workingFolder.loadTrackedFolder());
      if (!savedFolder) return;
      // The main process keeps the last listing, so no live scan is needed at startup
      await dispatch(refreshAll());
    } finally {
      dispatch(workingFolder.setInitialized(true));
    }
  };

// Saves whatever is open in every slice before switching folders

export const pickFolder =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<boolean> => {
    dispatch(workingFolder.setIsBusy(true));
    try {
      const selected = await workingFolder.selectFolderDialog();
      if (!selected) return false;

      const state = getState();
      if (projects.selectIsOpen(state)) {
        await dispatch(projects.saveToDisk());
      }

      const currentOverlay = overlays.selectCurrent(state);
      if (currentOverlay === TOverlay.PROMPT_TEMPLATE && promptTemplates.selectCurrent(state)) {
        await dispatch(savePromptTemplate());
      } else if (currentOverlay === TOverlay.GLOSSARY && glossaries.selectCurrent(state)) {
        await dispatch(glossaries.save());
      }

      await dispatch(workingFolder.setTrackedFolder(selected));

      dispatch(editor.resetMemoryState());
      dispatch(overlays.closeAll());
      dispatch(projects.reset());
      dispatch(prompt.reset());
      dispatch(aiPromptEditor.reset());

      await dispatch(forceRescan());
      return true;
    } finally {
      dispatch(workingFolder.setIsBusy(false));
    }
  };

import { api } from './createApi';
import type { AppDispatch, RootState } from './root';
import { aiPromptEditor, glossaries, promptTemplates } from './slices/aiPromptEditor';
import { ai } from './slices/ai';
import { workingFolder } from './slices/workingFolder';
import { editor } from './slices/editor';
import { TOverlay } from './slices/overlays';
import { overlays } from './slices/overlays';
import { projects } from './slices/project';
import { prompt } from './slices/prompt';
import { settings } from './slices/settings';

// Thunks that span slices which import each other, so they can't live in either slice file
// without an import cycle.

// ── AI Prompt Template ──────────────────────────────────────────────────────

// Lives here because it refreshes the translation's selected template (the ai slice), and the
// ai slice imports aiPromptEditor
const savePromptTemplate =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const { currentPromptTemplate, promptTemplateData } = state.aiPromptEditor;
    const folder = workingFolder.selectFolder(state);
    if (!currentPromptTemplate || !folder || !promptTemplateData) return;
    await promptTemplates.writeBody(currentPromptTemplate, promptTemplateData);
    await promptTemplates.refresh();
    if (prompt.selectSelectedPromptTemplateFileName(state) === currentPromptTemplate) {
      void ai.refreshSelectedPromptTemplateData();
    }
  };

// ── Overlays ────────────────────────────────────────────────────────────────

// Here rather than in the overlays slice: they reset aiPromptEditor, which imports overlays

const openSettingsOverlay = () => (): void => {
  aiPromptEditor.reset();
  overlays.setCurrent(TOverlay.SETTINGS);
};

const openExportOverlay = () => (): void => {
  aiPromptEditor.reset();
  overlays.setCurrent(TOverlay.EXPORT);
};

// ── Folder ──────────────────────────────────────────────────────────────────

// The folder's lists live in the slices that own the files (project, aiPromptEditor), and those
// import the workingFolder slice, so refreshing them all together has to happen here
const refreshAll = () => async (): Promise<void> => {
  if (!workingFolder.get.folder()) {
    projects.setList([]);
    promptTemplates.setItems([]);
    glossaries.setItems([]);
    return;
  }
  await Promise.all([projects.refresh(), promptTemplates.refresh(), glossaries.refresh()]);
};

// The only thunk that makes the main process scan the folder again -- restricted to the two
// explicit user actions (folder select, manual rescan) per design. Anything else reads the cached
// listing, so files changed outside the app show up only after one of these.
const workingFolderScan =
  () =>
  async (dispatch: AppDispatch): Promise<void> => {
    workingFolder.setIsBusy(true);
    try {
      await workingFolder.rescanFolder();
      await dispatch(refreshAll());
      // Best-effort housekeeping side effect of scanning -- not awaited (so it can't slow down the
      // scan) and not surfaced as a toast (it isn't a user-initiated action).
      void workingFolder.cleanupMediaCache().catch(() => {});
    } finally {
      workingFolder.setIsBusy(false);
    }
  };

// Saves whatever is open in every slice before switching folders

const workingFolderPick =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<boolean> => {
    workingFolder.setIsBusy(true);
    try {
      const selected = await workingFolder.selectFolderDialog();
      if (!selected) return false;

      const state = getState();
      if (projects.selectIsOpen(state)) {
        await projects.saveToDisk();
      }

      const currentOverlay = overlays.selectCurrent(state);
      if (currentOverlay === TOverlay.PROMPT_TEMPLATE && promptTemplates.selectCurrent(state)) {
        await dispatch(savePromptTemplate());
      } else if (currentOverlay === TOverlay.GLOSSARY && glossaries.selectCurrent(state)) {
        await glossaries.save();
      }

      await workingFolder.setTrackedFolder(selected);

      editor.resetMemoryState();
      overlays.closeAll();
      projects.reset();
      prompt.reset();
      aiPromptEditor.reset();

      await dispatch(workingFolderScan());
      return true;
    } finally {
      workingFolder.setIsBusy(false);
    }
  };

// ── App ─────────────────────────────────────────────────────────────────────

// Startup. Settings are awaited, so the first render already has the theme and language; the
// folder's lists and the AI integration load in the background.
const hydrateApp =
  () =>
  async (dispatch: AppDispatch): Promise<void> => {
    await settings.load();
    // The main process keeps the last listing, so no live scan is needed at startup
    void workingFolder
      .loadTrackedFolder()
      .then((savedFolder) => (savedFolder ? dispatch(refreshAll()) : undefined))
      .finally(() => workingFolder.setInitialized(true));
    void ai.initializeAiIntegration().catch(() => {});
  };

// ── API ──────────────────────────────────────────────────────────────────────

export const app = api('app', {
  thunks: {
    hydrateApp,
    openExportOverlay,
    openSettingsOverlay,
    savePromptTemplate,
    workingFolderPick,
    workingFolderScan,
  },
});

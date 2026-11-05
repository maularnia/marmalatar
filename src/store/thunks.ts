import { Service } from '@src/services/Service';
import type { AppDispatch } from './root';
import { promptTemplates } from '@src/services/prompt';
import { glossaries } from '@src/services/glossary';
import { ai } from '@src/services/ai';
import { folder } from '@src/services/folder';
import { editor } from '@src/services/project';
import { projects } from '@src/services/project';
import { settings } from '@src/services/settings';

// Thunks that span slices which import each other, so they can't live in either slice file
// without an import cycle.

// ── AI Prompt Template ──────────────────────────────────────────────────────

// Lives here because it refreshes the translation's selected template (the ai slice), and the
// ai slice imports the prompt slice
const savePromptTemplate = () => async (): Promise<void> => {
  const currentPromptTemplate = promptTemplates.get.current();
  const promptTemplateData = promptTemplates.get.data();
  const folderPath = folder.get.path();
  if (!currentPromptTemplate || !folderPath || !promptTemplateData) return;
  await promptTemplates.writeBody(currentPromptTemplate, promptTemplateData);
  await promptTemplates.refresh();
  if (promptTemplates.get.selectedFileName() === currentPromptTemplate) {
    void ai.refreshSelectedPromptTemplateData();
  }
};

// ── Folder ──────────────────────────────────────────────────────────────────

// The folder's lists live in the slices that own the files (project, prompt, glossary), and those
// import the folder service, so refreshing them all together has to happen here
const refreshAll = () => async (): Promise<void> => {
  if (!folder.get.path()) {
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
const scanFolder =
  () =>
  async (dispatch: AppDispatch): Promise<void> => {
    folder.setIsBusy(true);
    try {
      await folder.rescan();
      await dispatch(refreshAll());
      // Best-effort housekeeping side effect of scanning -- not awaited (so it can't slow down the
      // scan) and not surfaced as a toast (it isn't a user-initiated action).
      void folder.cleanupMediaCache().catch(() => {});
    } finally {
      folder.setIsBusy(false);
    }
  };

// Saves whatever is open in every slice before switching folders

const pickFolder =
  () =>
  async (dispatch: AppDispatch): Promise<boolean> => {
    folder.setIsBusy(true);
    try {
      const selected = await folder.pick();
      if (!selected) return false;

      if (projects.get.isOpen()) {
        await projects.saveToDisk();
      }

      // Whichever editors are open are saved; all overlays close below
      if (promptTemplates.get.current()) await dispatch(savePromptTemplate());
      if (glossaries.get.current()) await glossaries.save();

      await folder.setTracked(selected);

      editor.resetMemoryState();
      promptTemplates.closeEditor();
      glossaries.closeEditor();
      settings.close();
      settings.closeExport();
      projects.close();
      editor.setFrozenLineNumbers([]);
      promptTemplates.setSelectedFileName(null);
      glossaries.setSelectedFileNames([]);

      await dispatch(scanFolder());
      return true;
    } finally {
      folder.setIsBusy(false);
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
    void folder
      .loadTracked()
      .then((savedFolder) => (savedFolder ? dispatch(refreshAll()) : undefined))
      .finally(() => folder.setInitialized(true));
    void ai.initializeAiIntegration().catch(() => {});
  };

// ── API ──────────────────────────────────────────────────────────────────────

export const app = new Service('app', {
  thunks: {
    hydrateApp,
    savePromptTemplate,
    pickFolder,
    scanFolder,
  },
});

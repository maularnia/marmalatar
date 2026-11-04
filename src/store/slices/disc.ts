import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from '@store/root';
import {
  checkFileExists,
  cleanupMediaCache,
  deleteProjectFileOnDisk,
  getTrackedFolder,
  listGlossaries,
  listProjects,
  listPromptTemplates,
  renameProjectFileOnDisk,
  rescanFolder,
  updateProjectEmojiOnDisk,
  updateProjectProgress,
  type TGlossaryEntry,
  type TProjectEntry,
  type TPromptTemplateEntry,
} from '@src/utils/data/discIO';
import i18n from '@src/i18n';
import {
  selectSelectedPromptTemplateFileName,
  selectSelectedGlossaryFileNames,
  setSelectedPromptTemplateFileName,
  setSelectedGlossaryFileNames,
} from '@store/slices/prompt';
import {
  selectProjectId,
  setCurrentProjectFilePath,
  setProjectEmoji,
  setProjectName,
} from '@store/slices/project';
import { toSlug } from '@utils/string';

const t = i18n.getFixedT(null, 'errors');

type DiscState = {
  folder: string | null;
  initialized: boolean;
  projects: TProjectEntry[];
  promptTemplateItems: TPromptTemplateEntry[];
  glossaryItems: TGlossaryEntry[];
  isBusy: boolean;
};

const initialState: DiscState = {
  folder: null,
  initialized: false,
  projects: [],
  promptTemplateItems: [],
  glossaryItems: [],
  isBusy: false,
};

const discSlice = createSlice({
  name: 'disc',
  initialState,
  reducers: {
    setFolder(state, action: PayloadAction<string | null>) {
      state.folder = action.payload;
    },
    setInitialized(state, action: PayloadAction<boolean>) {
      state.initialized = action.payload;
    },
    setProjects(state, action: PayloadAction<TProjectEntry[]>) {
      state.projects = action.payload;
    },
    setPromptTemplateItems(state, action: PayloadAction<TPromptTemplateEntry[]>) {
      state.promptTemplateItems = action.payload;
    },
    setGlossaryItems(state, action: PayloadAction<TGlossaryEntry[]>) {
      state.glossaryItems = action.payload;
    },
    setIsBusy(state, action: PayloadAction<boolean>) {
      state.isBusy = action.payload;
    },
  },
  selectors: {
    selectFolder: (state) => state.folder,
    selectInitialized: (state) => state.initialized,
    selectProjects: (state) => state.projects,
    selectPromptTemplateItems: (state) => state.promptTemplateItems,
    selectGlossaryItems: (state) => state.glossaryItems,
    selectDiscIsBusy: (state) => state.isBusy,
  },
});

const { setInitialized, setProjects, setPromptTemplateItems, setGlossaryItems } = discSlice.actions;

export const { setFolder, setIsBusy } = discSlice.actions;

export const {
  selectFolder,
  selectInitialized,
  selectProjects,
  selectPromptTemplateItems,
  selectGlossaryItems,
  selectDiscIsBusy,
} = discSlice.selectors;

export default discSlice.reducer;

// ── Thunks ───────────────────────────────────────────────────────────────────

// The lists come from the main process, which renormalizes them against the tracked folder on
// every read, so after any write the renderer just reads them again.
export const refreshProjects =
  () =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(setProjects(await listProjects()));
  };

export const refreshPromptTemplates =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const promptTemplateItems = await listPromptTemplates();
    dispatch(setPromptTemplateItems(promptTemplateItems));
    const selectedTemplate = selectSelectedPromptTemplateFileName(getState());
    if (selectedTemplate && !promptTemplateItems.some((i) => i.fileName === selectedTemplate)) {
      dispatch(setSelectedPromptTemplateFileName(null));
    }
  };

export const refreshGlossaries =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const glossaryItems = await listGlossaries();
    dispatch(setGlossaryItems(glossaryItems));
    const selectedGlossaries = selectSelectedGlossaryFileNames(getState());
    const stillValidGlossaries = selectedGlossaries.filter((fn) =>
      glossaryItems.some((i) => i.fileName === fn)
    );
    if (stillValidGlossaries.length !== selectedGlossaries.length) {
      dispatch(setSelectedGlossaryFileNames(stillValidGlossaries));
    }
  };

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

export const initDisc =
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

export const persistProjectProgress =
  (projectId: string, translationProgress: number) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const items = selectProjects(getState());
    const idx = items.findIndex((p) => p.projectId === projectId);
    if (idx >= 0 && items[idx].translationProgress !== translationProgress) {
      const next = [...items];
      next[idx] = { ...next[idx], translationProgress };
      dispatch(setProjects(next));
    }
    await updateProjectProgress(projectId, translationProgress);
  };

export const renameProjectFile =
  (filePath: string, newName: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const folder = selectFolder(getState());
    if (!folder) throw new Error(t('project.folderNotTracked'));
    const trimmed = newName.trim();
    if (!trimmed) throw new Error(t('shared.nameEmpty'));

    const oldFileName = filePath.split(/[/\\]/).pop()!;
    const newFileName = `${toSlug(trimmed, 'project')}.mrml`;
    const newFilePath = `${folder}/${newFileName}`;

    if (newFileName !== oldFileName) {
      const exists = await checkFileExists(newFileName);
      if (exists) throw new Error(t('project.alreadyExists'));
    }

    const { project } = await renameProjectFileOnDisk(filePath, newFilePath, trimmed);

    if (project.projectId === selectProjectId(getState())) {
      dispatch(setCurrentProjectFilePath(newFilePath));
      dispatch(setProjectName(trimmed));
    }

    await dispatch(refreshProjects());
  };

export const updateProjectEmoji =
  (filePath: string, emoji: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const { project } = await updateProjectEmojiOnDisk(filePath, emoji);

    if (project.projectId === selectProjectId(getState())) {
      dispatch(setProjectEmoji(emoji));
    }

    await dispatch(refreshProjects());
  };

export const deleteProjectFile =
  (filePath: string) =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(setIsBusy(true));
    try {
      await deleteProjectFileOnDisk(filePath);
      await dispatch(refreshProjects());
      void cleanupMediaCache().catch(() => {});
    } finally {
      dispatch(setIsBusy(false));
    }
  };

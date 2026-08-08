import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from '@store/root';
import {
  checkFileExists,
  deleteProjectFileOnDisk,
  getFolderScanCache,
  getTrackedFolder,
  removeGlossaryCacheEntry,
  removeProjectCacheEntry,
  removePromptTemplateCacheEntry,
  renameProjectFileOnDisk,
  scanGlossaryFiles,
  scanProjectFileHeaders,
  scanPromptTemplateFiles,
  setFolderScanCache,
  updateProjectCacheProgress,
  updateProjectEmojiOnDisk,
  upsertGlossaryCacheEntry,
  upsertProjectCacheEntry,
  upsertPromptTemplateCacheEntry,
  type TProjectCacheEntry,
  type TPromptTemplateEntry,
  type TGlossaryFileEntry,
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
  projects: TProjectCacheEntry[];
  promptTemplateItems: TPromptTemplateEntry[];
  glossaryItems: TGlossaryFileEntry[];
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
    setProjects(state, action: PayloadAction<TProjectCacheEntry[]>) {
      state.projects = action.payload;
    },
    setPromptTemplateItems(state, action: PayloadAction<TPromptTemplateEntry[]>) {
      state.promptTemplateItems = action.payload;
    },
    setGlossaryItems(state, action: PayloadAction<TGlossaryFileEntry[]>) {
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

// The only thunk that does a live filesystem scan -- restricted to the two explicit
// user actions (folder select, manual rescan) per design. Refreshes the file list
// (names/emoji/languages) for projects/prompt-templates/glossaries and persists the
// result as the folder-scan cache; previously-known project progress is preserved
// rather than recomputed (progress only ever updates on project-open/line-completed).
export const forceRescan =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const folder = selectFolder(getState());
    if (!folder) {
      dispatch(setProjects([]));
      dispatch(setPromptTemplateItems([]));
      dispatch(setGlossaryItems([]));
      return;
    }
    dispatch(setIsBusy(true));
    try {
      const previousProgress = new Map(
        selectProjects(getState()).map((p) => [p.filePath, p.translationProgress])
      );
      const [projects, promptTemplateItems, glossaryItems] = await Promise.all([
        scanProjectFileHeaders(previousProgress),
        scanPromptTemplateFiles(),
        scanGlossaryFiles(),
      ]);
      dispatch(setProjects(projects));
      dispatch(setPromptTemplateItems(promptTemplateItems));
      dispatch(setGlossaryItems(glossaryItems));

      const selectedTemplate = selectSelectedPromptTemplateFileName(getState());
      if (selectedTemplate && !promptTemplateItems.some((i) => i.fileName === selectedTemplate)) {
        dispatch(setSelectedPromptTemplateFileName(null));
      }
      const selectedGlossaries = selectSelectedGlossaryFileNames(getState());
      const stillValidGlossaries = selectedGlossaries.filter((fn) =>
        glossaryItems.some((i) => i.fileName === fn)
      );
      if (stillValidGlossaries.length !== selectedGlossaries.length) {
        dispatch(setSelectedGlossaryFileNames(stillValidGlossaries));
      }

      await setFolderScanCache({
        folder,
        scannedAt: Date.now(),
        projects: Object.fromEntries(projects.map((p) => [p.filePath, p])),
        promptTemplates: Object.fromEntries(promptTemplateItems.map((i) => [i.fileName, i])),
        glossaries: Object.fromEntries(glossaryItems.map((i) => [i.fileName, i])),
      });
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

      const cache = await getFolderScanCache();
      if (cache && cache.folder === savedFolder) {
        dispatch(setProjects(Object.values(cache.projects)));
        dispatch(setPromptTemplateItems(Object.values(cache.promptTemplates)));
        dispatch(setGlossaryItems(Object.values(cache.glossaries)));
      } else {
        // No cache yet (first launch after this shipped) or the tracked folder changed
        // out-of-band -- bootstrap once with a live scan, then persist it.
        await dispatch(forceRescan());
      }
    } finally {
      dispatch(setInitialized(true));
    }
  };

export const upsertProjectInCache =
  (entry: TProjectCacheEntry, previousFilePath?: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const items = selectProjects(getState());
    const filtered = items.filter(
      (p) => p.filePath !== previousFilePath && p.filePath !== entry.filePath
    );
    dispatch(setProjects([...filtered, entry]));
    if (previousFilePath && previousFilePath !== entry.filePath) {
      await removeProjectCacheEntry(previousFilePath);
    }
    await upsertProjectCacheEntry(entry);
  };

const removeProjectFromCache =
  (filePath: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    dispatch(setProjects(selectProjects(getState()).filter((p) => p.filePath !== filePath)));
    await removeProjectCacheEntry(filePath);
  };

export const persistProjectProgress =
  (filePath: string, translationProgress: number) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const items = selectProjects(getState());
    const idx = items.findIndex((p) => p.filePath === filePath);
    if (idx >= 0 && items[idx].translationProgress !== translationProgress) {
      const next = [...items];
      next[idx] = { ...next[idx], translationProgress };
      dispatch(setProjects(next));
    }
    await updateProjectCacheProgress(filePath, translationProgress);
  };

export const upsertPromptTemplateInCache =
  (entry: TPromptTemplateEntry, previousFileName?: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const items = selectPromptTemplateItems(getState());
    const filtered = items.filter(
      (i) => i.fileName !== previousFileName && i.fileName !== entry.fileName
    );
    dispatch(setPromptTemplateItems([...filtered, entry]));
    if (previousFileName && previousFileName !== entry.fileName) {
      await removePromptTemplateCacheEntry(previousFileName);
    }
    await upsertPromptTemplateCacheEntry(entry);
  };

export const removePromptTemplateFromCache =
  (fileName: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    dispatch(
      setPromptTemplateItems(
        selectPromptTemplateItems(getState()).filter((i) => i.fileName !== fileName)
      )
    );
    await removePromptTemplateCacheEntry(fileName);
  };

export const upsertGlossaryInCache =
  (entry: TGlossaryFileEntry, previousFileName?: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const items = selectGlossaryItems(getState());
    const filtered = items.filter(
      (i) => i.fileName !== previousFileName && i.fileName !== entry.fileName
    );
    dispatch(setGlossaryItems([...filtered, entry]));
    if (previousFileName && previousFileName !== entry.fileName) {
      await removeGlossaryCacheEntry(previousFileName);
    }
    await upsertGlossaryCacheEntry(entry);
  };

export const removeGlossaryFromCache =
  (fileName: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    dispatch(
      setGlossaryItems(selectGlossaryItems(getState()).filter((i) => i.fileName !== fileName))
    );
    await removeGlossaryCacheEntry(fileName);
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

    const previous = selectProjects(getState()).find((p) => p.filePath === filePath);
    await dispatch(
      upsertProjectInCache(
        {
          version: 1,
          filePath: newFilePath,
          fileName: newFileName,
          translationProgress: previous?.translationProgress ?? 0,
          project: {
            projectId: project.projectId,
            projectName: project.projectName,
            emoji: project.emoji,
          },
        },
        filePath
      )
    );
  };

export const updateProjectEmoji =
  (filePath: string, emoji: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const { project } = await updateProjectEmojiOnDisk(filePath, emoji);

    if (project.projectId === selectProjectId(getState())) {
      dispatch(setProjectEmoji(emoji));
    }

    const previous = selectProjects(getState()).find((p) => p.filePath === filePath);
    await dispatch(
      upsertProjectInCache({
        version: 1,
        filePath,
        fileName: filePath.split(/[/\\]/).pop()!,
        translationProgress: previous?.translationProgress ?? 0,
        project: {
          projectId: project.projectId,
          projectName: project.projectName,
          emoji: project.emoji,
        },
      })
    );
  };

export const deleteProjectFile =
  (filePath: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    dispatch(setIsBusy(true));
    try {
      const projectId = selectProjects(getState()).find((p) => p.filePath === filePath)?.project
        .projectId;
      await deleteProjectFileOnDisk(filePath, projectId);
      await dispatch(removeProjectFromCache(filePath));
    } finally {
      dispatch(setIsBusy(false));
    }
  };

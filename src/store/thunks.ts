import i18n from '@src/i18n';
import { DEFAULT_PROMPT_TEMPLATE } from '@src/services/ai/config';
import { TLanguage, TSubtitleLine } from '@src/types';
import {
  buildProjectEditorStateSaveData,
  checkFileExists,
  deleteFile,
  getProjectEditorState,
  readGlossaryFile,
  readProjectFile,
  readPromptTemplateFile,
  selectFolderDialog,
  setTrackedFolder,
  writeGlossaryFile,
  writeProjectEditorState,
  writeProjectSaveData,
  writePromptTemplateFile,
  type TProjectEditorState,
  type TScannedProjectEntry,
} from '@src/utils/data/discIO';
import type { AIGlossaryFileDataType, PromptTemplateFileDataType } from '@src/utils/data/schemas';
import { pickRandomCreationEmoji } from '@src/utils/emoji';
import { toSlug } from '@utils/string';
import type { AppDispatch, RootState } from './root';
import {
  resetAiPromptEditor,
  selectCurrentGlossary,
  selectCurrentPromptTemplate,
  setCurrentGlossary,
  setCurrentPromptTemplate,
  setGlossaryData,
  setPromptTemplateData,
  setResolvedGlossaryEntries,
} from './slices/aiPromptEditor';
import { refreshSelectedPromptTemplateData } from './slices/aiTranslation';
import {
  forceRescan,
  persistProjectProgress,
  removeGlossaryFromCache,
  removePromptTemplateFromCache,
  selectFolder,
  selectGlossaryItems,
  setFolder,
  setIsBusy,
  upsertGlossaryInCache,
  upsertProjectInCache,
  upsertPromptTemplateInCache,
} from './slices/disc';
import {
  clearFileData,
  resetEditorMemoryState,
  setCharacterPool,
  setLines,
  setTotalLinesToTranslate,
  setVideoCollapsed,
} from './slices/editor';
import {
  closeOverlays,
  selectCurrentOverlay,
  setCurrentOverlay,
  TOverlay,
} from './slices/overlays';
import {
  resetProject,
  selectCurrentProjectFilePath,
  selectIsProjectOpen,
  selectProjectSourceLanguage,
  selectProjectTargetLanguage,
  setCurrentProjectFilePath,
  setEditorMode,
  setProjectEmoji,
  setProjectId,
  setProjectName,
  setProjectSourceLanguage,
  setProjectTargetLanguage,
  setVideoFilePath,
} from './slices/project';
import {
  resetPromptState,
  selectSelectedGlossaryFileNames,
  selectSelectedPromptTemplateFileName,
  setFrozenLineNumbers,
  setSelectedGlossaryFileNames,
  setSelectedPromptTemplateFileName,
} from './slices/prompt';

const t = i18n.getFixedT(null, 'errors');

// ── Project ─────────────────────────────────────────────────────────────────

type CreateNewProjectParams = {
  filePath: string;
  lines: TSubtitleLine[];
  projectName: string;
  sourceLanguage: TLanguage;
  targetLanguage: TLanguage;
};

export const createNewProject =
  (params: CreateNewProjectParams) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const projectName = params.projectName.trim();
    if (!projectName) throw new Error(t('project.nameRequired'));

    dispatch(setCurrentProjectFilePath(null));
    dispatch(resetEditorMemoryState());
    dispatch(setVideoCollapsed(false));

    let emoji: string;
    try {
      emoji = await pickRandomCreationEmoji();
    } catch {
      throw new Error(t('createNewProject.emojiSelectionFailed'));
    }
    const projectId = crypto.randomUUID();

    applyProjectData(dispatch, {
      project: {
        projectId,
        projectName,
        emoji,
        sourceLanguage: params.sourceLanguage,
        targetLanguage: params.targetLanguage,
      },
      editor: {
        characterPool: [],
        lines: params.lines,
      },
    });

    dispatch(setEditorMode('translate'));

    dispatch(setCurrentProjectFilePath(params.filePath));
    try {
      await dispatch(saveProjectToDisk(params.filePath));
    } catch {
      throw new Error(t('createNewProject.fileSaveFailed'));
    }

    const state = getState();
    if (state.project.projectId) {
      try {
        await writeProjectEditorState(
          state.project.projectId,
          buildProjectEditorStateSaveData(state)
        );
      } catch {
        throw new Error(t('createNewProject.editorStateSaveFailed'));
      }
    }

    try {
      await dispatch(
        upsertProjectInCache({
          version: 1,
          filePath: params.filePath,
          fileName: params.filePath.split(/[/\\]/).pop()!,
          translationProgress: 0,
          project: { projectId, projectName, emoji },
        })
      );
    } catch {
      throw new Error(t('createNewProject.cacheUpdateFailed'));
    }
  };

export const saveProjectToDisk =
  (filePath: string) =>
  async (_dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    await writeProjectSaveData(filePath, getState());
  };

// Saves the currently open project (if any) before tearing down editor/project state to start a
// new one -- no confirmation dialog, the save makes it non-destructive.
export const startNewProject =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const currentProjectFilePath = selectCurrentProjectFilePath(state);
    if (selectIsProjectOpen(state) && currentProjectFilePath) {
      await dispatch(saveProjectToDisk(currentProjectFilePath));
    }
    dispatch(resetEditorMemoryState());
    dispatch(resetProject());
    dispatch(clearFileData());
  };

export const loadProjectFromDisk =
  (filePath: string) =>
  async (dispatch: AppDispatch): Promise<void> => {
    let data: TScannedProjectEntry;
    try {
      data = await readProjectFile(filePath);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : t('project.cannotRead'));
    }

    dispatch(setCurrentProjectFilePath(null));
    dispatch(resetEditorMemoryState());

    applyProjectData(dispatch, data);

    let editorState: TProjectEditorState;
    try {
      editorState = await getProjectEditorState(data.project.projectId);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : t('project.editorStateReadFailed'));
    }
    dispatch(setEditorMode(editorState.editorMode));
    dispatch(setVideoCollapsed(editorState.isVideoCollapsed));
    // Restore the video that was attached when the project was last saved/closed.
    dispatch(setVideoFilePath(editorState.videoPath));

    dispatch(setCurrentProjectFilePath(filePath));

    // Self-heals the cached progress the moment a project is opened (e.g. if the file
    // was edited outside the app since the cache was last written).
    try {
      await dispatch(persistProjectProgress(data.filePath, data.translationProgress));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : t('project.progressPersistFailed'));
    }
  };

function applyProjectData(
  dispatch: AppDispatch,
  data: Pick<TScannedProjectEntry, 'project' | 'editor'>
): void {
  dispatch(setProjectId(data.project.projectId));
  dispatch(setProjectName(data.project.projectName));
  dispatch(setProjectEmoji(data.project.emoji));

  dispatch(setProjectSourceLanguage(data.project.sourceLanguage));
  dispatch(setProjectTargetLanguage(data.project.targetLanguage));
  dispatch(reconcileGlossarySelectionWithDirection());
  dispatch(setFrozenLineNumbers([]));

  dispatch(setCharacterPool(data.editor.characterPool));

  dispatch(setLines(data.editor.lines));
  dispatch(setTotalLinesToTranslate(data.editor.lines.length));
}

// ── AI Prompt Template ──────────────────────────────────────────────────────

const initializePromptTemplateEditor =
  (fileName: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    dispatch(setCurrentGlossary(null));
    dispatch(setGlossaryData(null));
    dispatch(setCurrentPromptTemplate(fileName));
    dispatch(setPromptTemplateData(null));
    const folder = selectFolder(getState());
    if (!folder) return;
    const data = await readPromptTemplateFile(fileName);
    dispatch(setPromptTemplateData(data));
  };

export const savePromptTemplate =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const { currentPromptTemplate, promptTemplateData } = state.aiPromptEditor;
    const folder = selectFolder(state);
    if (!currentPromptTemplate || !folder || !promptTemplateData) return;
    await writePromptTemplateFile(currentPromptTemplate, promptTemplateData);
    await dispatch(
      upsertPromptTemplateInCache({
        version: 1,
        fileName: currentPromptTemplate,
        title: promptTemplateData.title,
        emoji: promptTemplateData.emoji,
      })
    );
    if (selectSelectedPromptTemplateFileName(state) === currentPromptTemplate) {
      void dispatch(refreshSelectedPromptTemplateData());
    }
  };

export const deletePromptTemplate =
  (fileName: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = selectFolder(state);
    if (!folder) return;
    await deleteFile(fileName);
    await dispatch(removePromptTemplateFromCache(fileName));
    if (state.aiPromptEditor.currentPromptTemplate === fileName) {
      dispatch(resetAiPromptEditor());
    }
  };

export const renamePromptTemplateFile =
  (fileName: string, newTitle: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = selectFolder(state);
    if (!folder) throw new Error(t('shared.folderNotSelected'));
    const trimmed = newTitle.trim();
    if (!trimmed) throw new Error(t('shared.nameEmpty'));

    const newFileName = `${toSlug(trimmed, 'prompt-template')}.mrmlpt`;
    if (newFileName !== fileName) {
      const exists = await checkFileExists(newFileName);
      if (exists) throw new Error(t('promptTemplate.alreadyExists', { title: trimmed }));
    }

    const data = await readPromptTemplateFile(fileName);
    if (!data) throw new Error(t('promptTemplate.readFailed'));
    const updated: PromptTemplateFileDataType = { ...data, title: trimmed };
    await writePromptTemplateFile(newFileName, updated);

    if (newFileName !== fileName) {
      await deleteFile(fileName);
      const selectedPt = selectSelectedPromptTemplateFileName(state);
      if (selectedPt === fileName) dispatch(setSelectedPromptTemplateFileName(newFileName));
      if (state.aiPromptEditor.currentPromptTemplate === fileName) {
        dispatch(setCurrentPromptTemplate(newFileName));
        dispatch(setPromptTemplateData(updated));
      }
    } else if (state.aiPromptEditor.currentPromptTemplate === fileName) {
      dispatch(setPromptTemplateData(updated));
    }

    await dispatch(
      upsertPromptTemplateInCache(
        { version: 1, fileName: newFileName, title: trimmed, emoji: updated.emoji },
        newFileName !== fileName ? fileName : undefined
      )
    );
  };

export const updatePromptTemplateEmoji =
  (fileName: string, emoji: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = selectFolder(state);
    if (!folder) throw new Error(t('shared.folderNotSelected'));

    const data = await readPromptTemplateFile(fileName);
    if (!data) throw new Error(t('promptTemplate.readFailed'));
    const updated: PromptTemplateFileDataType = { ...data, emoji };
    await writePromptTemplateFile(fileName, updated);

    if (state.aiPromptEditor.currentPromptTemplate === fileName) {
      dispatch(setPromptTemplateData(updated));
    }

    await dispatch(
      upsertPromptTemplateInCache({
        version: 1,
        fileName,
        title: updated.title,
        emoji: updated.emoji,
      })
    );
  };

export const createPromptTemplateFile =
  (title: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = selectFolder(state);
    if (!folder) throw new Error(t('shared.folderNotSelected'));
    const trimmed = title.trim();
    if (!trimmed) throw new Error(t('shared.nameEmpty'));

    const fileName = `${toSlug(trimmed, 'prompt-template')}.mrmlpt`;
    const exists = await checkFileExists(fileName);
    if (exists) throw new Error(t('promptTemplate.alreadyExists', { title: trimmed }));

    const emoji = await pickRandomCreationEmoji();
    const data: PromptTemplateFileDataType = {
      version: 1,
      title: trimmed,
      emoji,
      promptTemplate: DEFAULT_PROMPT_TEMPLATE,
    };
    await writePromptTemplateFile(fileName, data);
    await dispatch(upsertPromptTemplateInCache({ version: 1, fileName, title: trimmed, emoji }));
    await dispatch(openPromptTemplateEditor(fileName));
  };

export const openPromptTemplateEditor =
  (filename: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    if (
      selectCurrentOverlay(state) === TOverlay.PROMPT_TEMPLATE &&
      selectCurrentPromptTemplate(state) === filename
    ) {
      return;
    }
    dispatch(setCurrentOverlay(TOverlay.PROMPT_TEMPLATE));
    await dispatch(initializePromptTemplateEditor(filename));
  };

// ── AI Glossary ─────────────────────────────────────────────────────────────

const initializeGlossaryEditor =
  (fileName: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    dispatch(setCurrentPromptTemplate(null));
    dispatch(setPromptTemplateData(null));
    dispatch(setCurrentGlossary(fileName));
    dispatch(setGlossaryData(null));
    const folder = selectFolder(getState());
    if (!folder) return;
    const data = await readGlossaryFile(fileName);
    dispatch(setGlossaryData(data));
  };

export const saveGlossary =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const { currentGlossary, glossaryData } = state.aiPromptEditor;
    const folder = selectFolder(state);
    if (!currentGlossary || !folder || !glossaryData) return;
    const dataToSave: AIGlossaryFileDataType = {
      ...glossaryData,
      list: glossaryData.list.filter((e) => e.original.trim() || e.translation.trim()),
    };
    await writeGlossaryFile(currentGlossary, dataToSave);
    await dispatch(
      upsertGlossaryInCache({
        version: 1,
        fileName: currentGlossary,
        title: dataToSave.title,
        emoji: dataToSave.emoji,
        sourceLanguage: dataToSave.sourceLanguage,
        targetLanguage: dataToSave.targetLanguage,
      })
    );
    if (selectSelectedGlossaryFileNames(state).includes(currentGlossary)) {
      dispatch(reconcileGlossarySelectionWithDirection());
    }
  };

export const deleteGlossary =
  (fileName: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = selectFolder(state);
    if (!folder) return;
    await deleteFile(fileName);
    await dispatch(removeGlossaryFromCache(fileName));
    if (state.aiPromptEditor.currentGlossary === fileName) {
      dispatch(resetAiPromptEditor());
    }
  };

export const renameGlossaryFile =
  (fileName: string, newTitle: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = selectFolder(state);
    if (!folder) throw new Error(t('shared.folderNotSelected'));
    const trimmed = newTitle.trim();
    if (!trimmed) throw new Error(t('shared.nameEmpty'));

    const newFileName = `${toSlug(trimmed, 'glossary')}.mrmlg`;
    if (newFileName !== fileName) {
      const exists = await checkFileExists(newFileName);
      if (exists) throw new Error(t('glossaryFile.alreadyExists', { title: trimmed }));
    }

    const data = await readGlossaryFile(fileName);
    if (!data) throw new Error(t('glossaryFile.readFailed'));
    const updated: AIGlossaryFileDataType = { ...data, title: trimmed };
    await writeGlossaryFile(newFileName, updated);

    if (newFileName !== fileName) {
      await deleteFile(fileName);
      const selectedGlossaries = selectSelectedGlossaryFileNames(state);
      if (selectedGlossaries.includes(fileName)) {
        dispatch(
          setSelectedGlossaryFileNames(
            selectedGlossaries.map((fn) => (fn === fileName ? newFileName : fn))
          )
        );
      }
      if (state.aiPromptEditor.currentGlossary === fileName) {
        dispatch(setCurrentGlossary(newFileName));
        dispatch(setGlossaryData(updated));
      }
    } else if (state.aiPromptEditor.currentGlossary === fileName) {
      dispatch(setGlossaryData(updated));
    }

    await dispatch(
      upsertGlossaryInCache(
        {
          version: 1,
          fileName: newFileName,
          title: trimmed,
          emoji: updated.emoji,
          sourceLanguage: updated.sourceLanguage,
          targetLanguage: updated.targetLanguage,
        },
        newFileName !== fileName ? fileName : undefined
      )
    );
  };

export const updateGlossaryEmoji =
  (fileName: string, emoji: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = selectFolder(state);
    if (!folder) throw new Error(t('shared.folderNotSelected'));

    const data = await readGlossaryFile(fileName);
    if (!data) throw new Error(t('glossaryFile.readFailed'));
    const updated: AIGlossaryFileDataType = { ...data, emoji };
    await writeGlossaryFile(fileName, updated);

    if (state.aiPromptEditor.currentGlossary === fileName) {
      dispatch(setGlossaryData(updated));
    }

    await dispatch(
      upsertGlossaryInCache({
        version: 1,
        fileName,
        title: updated.title,
        emoji: updated.emoji,
        sourceLanguage: updated.sourceLanguage,
        targetLanguage: updated.targetLanguage,
      })
    );
  };

export const createGlossaryFile =
  (title: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = selectFolder(state);
    if (!folder) throw new Error(t('shared.folderNotSelected'));
    const trimmed = title.trim();
    if (!trimmed) throw new Error(t('shared.nameEmpty'));

    const fileName = `${toSlug(trimmed, 'glossary')}.mrmlg`;
    const exists = await checkFileExists(fileName);
    if (exists) throw new Error(t('glossaryFile.alreadyExists', { title: trimmed }));

    const emoji = await pickRandomCreationEmoji();
    const data: AIGlossaryFileDataType = {
      version: 1,
      title: trimmed,
      emoji,
      sourceLanguage: TLanguage.English,
      targetLanguage: TLanguage.Belarusian,
      list: [],
    };
    await writeGlossaryFile(fileName, data);
    await dispatch(
      upsertGlossaryInCache({
        version: 1,
        fileName,
        title: trimmed,
        emoji,
        sourceLanguage: data.sourceLanguage,
        targetLanguage: data.targetLanguage,
      })
    );
    await dispatch(openAIGlossaryEditor(fileName));
  };

export const addEntryToGlossary =
  (entry: { original: string; translation: string }, targetFileName?: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<boolean> => {
    const state = getState();
    const { currentGlossary, glossaryData } = state.aiPromptEditor;
    const folder = selectFolder(state);
    if (!folder) return false;

    const target = targetFileName ?? currentGlossary;
    if (!target) return false;

    const existing: AIGlossaryFileDataType | null =
      target === currentGlossary && glossaryData ? glossaryData : await readGlossaryFile(target);
    if (!existing) return false;

    const updated: AIGlossaryFileDataType = { ...existing, list: [...existing.list, entry] };
    await writeGlossaryFile(target, updated);

    if (target === currentGlossary) {
      dispatch(setGlossaryData(updated));
    }

    return true;
  };

// Filters selected glossary file names down to those whose own source/target language actually
// matches the project's current translation direction -- the selection in prompt slice state can
// go stale relative to the direction (e.g. right after the user flips source/target), and nothing
// upstream is guaranteed to have pruned it yet. Keeping this check here, at the one place entries
// actually get resolved for sending, means a mismatched glossary can never leak into a prompt
// regardless of what the UI selection currently looks like. The AI clients themselves stay
// language-agnostic -- they only ever see the already-filtered `glossaryEntries` pairs.
function selectDirectionMatchedGlossaryFileNames(state: RootState): string[] {
  const selectedFileNames = selectSelectedGlossaryFileNames(state);
  const sourceLanguage = selectProjectSourceLanguage(state);
  const targetLanguage = selectProjectTargetLanguage(state);
  const glossaryItems = selectGlossaryItems(state);
  const itemsByFileName = new Map(glossaryItems.map((item) => [item.fileName, item]));
  return selectedFileNames.filter((fileName) => {
    const item = itemsByFileName.get(fileName);
    return (
      item !== undefined &&
      item.sourceLanguage === sourceLanguage &&
      item.targetLanguage === targetLanguage
    );
  });
}

export const refreshResolvedGlossaryEntries =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const matchedFileNames = selectDirectionMatchedGlossaryFileNames(state);
    const folder = selectFolder(state);
    if (!folder || !matchedFileNames.length) {
      dispatch(setResolvedGlossaryEntries([]));
      return;
    }
    const seen = new Map<string, string>();
    for (const fileName of matchedFileNames) {
      const data = await readGlossaryFile(fileName);
      if (data) {
        for (const e of data.list) seen.set(e.original, e.translation);
      }
    }
    dispatch(setResolvedGlossaryEntries(Array.from(seen.entries())));
  };

// Prunes the glossary selection down to whatever still matches the project's current direction,
// and refreshes the resolved entries cache for what remains. Dispatched explicitly at every point
// that can change what "matches the direction" means: a glossary being saved (its own language
// pair may have changed), the project's source/target language changing, or a different project
// loading -- rather than via a listener, so the reconciliation lives right next to the action that
// actually needs it.
export const reconcileGlossarySelectionWithDirection =
  () =>
  (dispatch: AppDispatch, getState: () => RootState): void => {
    const state = getState();
    const currentFileNames = selectSelectedGlossaryFileNames(state);
    const matchedFileNames = selectDirectionMatchedGlossaryFileNames(state);
    if (matchedFileNames.length !== currentFileNames.length) {
      dispatch(setSelectedGlossaryFileNames(matchedFileNames));
    }
    void dispatch(refreshResolvedGlossaryEntries());
  };

export const openAIGlossaryEditor =
  (filename: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    if (
      selectCurrentOverlay(state) === TOverlay.GLOSSARY &&
      selectCurrentGlossary(state) === filename
    ) {
      return;
    }
    dispatch(setCurrentOverlay(TOverlay.GLOSSARY));
    await dispatch(initializeGlossaryEditor(filename));
  };

// ── Overlays ────────────────────────────────────────────────────────────────

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

export const pickFolder =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<boolean> => {
    dispatch(setIsBusy(true));
    try {
      const selected = await selectFolderDialog();
      if (!selected) return false;

      const state = getState();
      const currentProjectFilePath = selectCurrentProjectFilePath(state);
      if (selectIsProjectOpen(state) && currentProjectFilePath) {
        await dispatch(saveProjectToDisk(currentProjectFilePath));
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

import i18n from '@src/i18n';
import { DEFAULT_PROMPT_TEMPLATE } from '@src/services/ai/config';
import { TLanguage, TSubtitleLine } from '@src/types';
import {
  buildProjectEditorStateSaveData,
  createGlossaryOnDisk,
  createProjectOnDisk,
  createPromptTemplateOnDisk,
  deleteGlossaryOnDisk,
  deletePromptTemplateOnDisk,
  getProjectEditorState,
  readGlossaryFile,
  readProjectFile,
  readPromptTemplateFile,
  renameGlossaryOnDisk,
  renamePromptTemplateOnDisk,
  selectFolderDialog,
  setTrackedFolder,
  updateGlossaryEmojiOnDisk,
  updateGlossaryLanguagesOnDisk,
  updateProjectLanguagesOnDisk,
  updatePromptTemplateEmojiOnDisk,
  writeGlossaryBody,
  writeProjectBody,
  writeProjectEditorState,
  writePromptTemplateBody,
  type TProjectEditorState,
  type TProjectEntry,
} from '@src/utils/data/discIO';
import type {
  AIGlossaryFileDataType,
  PromptTemplateFileDataType,
  TProjectFileData,
} from '@src/utils/data/schemas';
import { pickRandomCreationEmoji } from '@src/utils/emoji';
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
  applyProjectEntry,
  refreshGlossaries,
  refreshProjects,
  refreshPromptTemplates,
  selectFolder,
  selectGlossaryItems,
  setFolder,
  setIsBusy,
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
    const { sourceLanguage, targetLanguage } = params;

    dispatch(setCurrentProjectFilePath(null));
    dispatch(resetEditorMemoryState());
    dispatch(setVideoCollapsed(false));

    let emoji: string;
    try {
      emoji = await pickRandomCreationEmoji();
    } catch {
      throw new Error(t('createNewProject.emojiSelectionFailed'));
    }

    // The main process names the file and assigns the projectId, so the project exists on disk
    // before anything is applied to the editor
    const editor = { characterPool: [], lines: params.lines };
    let entry: TProjectEntry | null;
    try {
      entry = await createProjectOnDisk(
        { projectName, emoji, sourceLanguage, targetLanguage },
        { editor }
      );
    } catch {
      throw new Error(t('createNewProject.fileSaveFailed'));
    }
    if (!entry) throw new Error(t('project.alreadyExists'));

    applyProjectData(dispatch, {
      project: {
        projectId: entry.projectId,
        projectName: entry.projectName,
        emoji: entry.emoji,
        sourceLanguage,
        targetLanguage,
      },
      editor,
    });

    dispatch(setEditorMode('translate'));
    dispatch(setCurrentProjectFilePath(entry.filePath));

    try {
      await writeProjectEditorState(entry.projectId, buildProjectEditorStateSaveData(getState()));
    } catch {
      throw new Error(t('createNewProject.editorStateSaveFailed'));
    }

    try {
      await dispatch(refreshProjects());
    } catch {
      throw new Error(t('createNewProject.cacheUpdateFailed'));
    }
  };

// Writes the open project's lines and characters to its file. A project without a file yet is
// skipped: createNewProject creates it. The returned entry carries the progress the main process
// computed from the new lines.
export const saveProjectToDisk =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const { projectId } = state.project;
    if (!projectId || !selectCurrentProjectFilePath(state)) return;
    dispatch(applyProjectEntry(await writeProjectBody(projectId, state)));
  };

export const saveProjectLanguages =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const { projectId, sourceLanguage, targetLanguage } = state.project;
    if (!projectId || !sourceLanguage || !targetLanguage) return;
    if (!selectCurrentProjectFilePath(state)) return;
    dispatch(
      applyProjectEntry(
        await updateProjectLanguagesOnDisk(projectId, sourceLanguage, targetLanguage)
      )
    );
  };

// Saves the currently open project (if any) before tearing down editor/project state to start a
// new one -- no confirmation dialog, the save makes it non-destructive.
export const startNewProject =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    if (selectIsProjectOpen(getState())) {
      await dispatch(saveProjectToDisk());
    }
    dispatch(resetEditorMemoryState());
    dispatch(resetProject());
    dispatch(clearFileData());
  };

export const loadProjectFromDisk =
  (project: TProjectEntry) =>
  async (dispatch: AppDispatch): Promise<void> => {
    let data: TProjectFileData;
    try {
      data = await readProjectFile(project.projectId);
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

    dispatch(setCurrentProjectFilePath(project.filePath));
  };

function applyProjectData(
  dispatch: AppDispatch,
  data: Pick<TProjectFileData, 'project' | 'editor'>
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
    await writePromptTemplateBody(currentPromptTemplate, promptTemplateData);
    await dispatch(refreshPromptTemplates());
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
    await deletePromptTemplateOnDisk(fileName);
    await dispatch(refreshPromptTemplates());
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

    const newFileName = await renamePromptTemplateOnDisk(fileName, trimmed);
    if (!newFileName) throw new Error(t('promptTemplate.alreadyExists', { title: trimmed }));
    // Re-read: the main process wrote the header
    const updated = await readPromptTemplateFile(newFileName);
    if (!updated) throw new Error(t('promptTemplate.readFailed'));

    if (newFileName !== fileName) {
      const selectedPt = selectSelectedPromptTemplateFileName(state);
      if (selectedPt === fileName) dispatch(setSelectedPromptTemplateFileName(newFileName));
      if (state.aiPromptEditor.currentPromptTemplate === fileName) {
        dispatch(setCurrentPromptTemplate(newFileName));
        dispatch(setPromptTemplateData(updated));
      }
    } else if (state.aiPromptEditor.currentPromptTemplate === fileName) {
      dispatch(setPromptTemplateData(updated));
    }

    await dispatch(refreshPromptTemplates());
  };

export const updatePromptTemplateEmoji =
  (fileName: string, emoji: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = selectFolder(state);
    if (!folder) throw new Error(t('shared.folderNotSelected'));

    await updatePromptTemplateEmojiOnDisk(fileName, emoji);
    const updated = await readPromptTemplateFile(fileName);
    if (!updated) throw new Error(t('promptTemplate.readFailed'));

    if (state.aiPromptEditor.currentPromptTemplate === fileName) {
      dispatch(setPromptTemplateData(updated));
    }

    await dispatch(refreshPromptTemplates());
  };

export const createPromptTemplateFile =
  (title: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = selectFolder(state);
    if (!folder) throw new Error(t('shared.folderNotSelected'));
    const trimmed = title.trim();
    if (!trimmed) throw new Error(t('shared.nameEmpty'));

    const emoji = await pickRandomCreationEmoji();
    const data: PromptTemplateFileDataType = {
      version: 1,
      title: trimmed,
      emoji,
      promptTemplate: DEFAULT_PROMPT_TEMPLATE,
    };
    const fileName = await createPromptTemplateOnDisk(data);
    if (!fileName) throw new Error(t('promptTemplate.alreadyExists', { title: trimmed }));
    await dispatch(refreshPromptTemplates());
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
    await writeGlossaryBody(currentGlossary, dataToSave);
    await dispatch(refreshGlossaries());
    if (selectSelectedGlossaryFileNames(state).includes(currentGlossary)) {
      dispatch(reconcileGlossarySelectionWithDirection());
    }
  };

// Languages are part of the file header, written by the main process. The open editor keeps its
// unsaved pairs and takes the new languages.
export const updateGlossaryLanguages =
  (fileName: string, sourceLanguage: TLanguage, targetLanguage: TLanguage) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    await updateGlossaryLanguagesOnDisk(fileName, sourceLanguage, targetLanguage);
    const { currentGlossary, glossaryData } = getState().aiPromptEditor;
    if (currentGlossary === fileName && glossaryData) {
      dispatch(setGlossaryData({ ...glossaryData, sourceLanguage, targetLanguage }));
    }
    await dispatch(refreshGlossaries());
    // A selected glossary may no longer match the project's direction
    if (selectSelectedGlossaryFileNames(getState()).includes(fileName)) {
      dispatch(reconcileGlossarySelectionWithDirection());
    }
  };

export const deleteGlossary =
  (fileName: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = selectFolder(state);
    if (!folder) return;
    await deleteGlossaryOnDisk(fileName);
    await dispatch(refreshGlossaries());
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

    const newFileName = await renameGlossaryOnDisk(fileName, trimmed);
    if (!newFileName) throw new Error(t('glossaryFile.alreadyExists', { title: trimmed }));
    // Re-read: the main process wrote the header
    const updated = await readGlossaryFile(newFileName);
    if (!updated) throw new Error(t('glossaryFile.readFailed'));

    if (newFileName !== fileName) {
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

    await dispatch(refreshGlossaries());
  };

export const updateGlossaryEmoji =
  (fileName: string, emoji: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = selectFolder(state);
    if (!folder) throw new Error(t('shared.folderNotSelected'));

    await updateGlossaryEmojiOnDisk(fileName, emoji);
    const updated = await readGlossaryFile(fileName);
    if (!updated) throw new Error(t('glossaryFile.readFailed'));

    if (state.aiPromptEditor.currentGlossary === fileName) {
      dispatch(setGlossaryData(updated));
    }

    await dispatch(refreshGlossaries());
  };

export const createGlossaryFile =
  (title: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = selectFolder(state);
    if (!folder) throw new Error(t('shared.folderNotSelected'));
    const trimmed = title.trim();
    if (!trimmed) throw new Error(t('shared.nameEmpty'));

    const emoji = await pickRandomCreationEmoji();
    const data: AIGlossaryFileDataType = {
      version: 1,
      title: trimmed,
      emoji,
      sourceLanguage: TLanguage.English,
      targetLanguage: TLanguage.Belarusian,
      list: [],
    };
    const fileName = await createGlossaryOnDisk(data);
    if (!fileName) throw new Error(t('glossaryFile.alreadyExists', { title: trimmed }));
    await dispatch(refreshGlossaries());
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
    await writeGlossaryBody(target, updated);

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

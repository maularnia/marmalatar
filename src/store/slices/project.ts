import { api } from '@store/createApi';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { TProjectListEntry } from '@bridge/definitions/projectEntry';
import type { TProjectStatePrefs } from '@bridge/definitions/projectState';
import i18n from '@src/i18n';
import { IPC } from '@src/services/ipc/IPC';
import { TLanguage, TSubtitleLine } from '@src/types';
import { parseProjectFile } from '@src/utils/data/parsers/project';
import {
  ProjectEditorStateSchema,
  ProjectSaveV1Schema,
  type TProjectEditorState,
  type TProjectFileBody,
  type TProjectFileData,
} from '@src/utils/data/schemas';
import { pickRandomCreationEmoji } from '@src/utils/emoji';
import type { AppDispatch, RootState } from '@store/root';
import { glossaries } from '@store/slices/aiPromptEditor';
import { workingFolder } from '@store/slices/workingFolder';
import { editor } from '@store/slices/editor';
import { prompt } from '@store/slices/prompt';

export type TProjectEntry = TProjectListEntry;

const t = i18n.getFixedT(null, 'errors');

// ── IPC ──────────────────────────────────────────────────────────────────────

// Files in the tracked folder are reached only through the main process's project, prompt template
// and glossary services, keyed by projectId or file name. The renderer reads whole files but
// writes only their bodies: headers (names, titles, emoji, languages) change through dedicated
// calls, and the services compute what derives from the file, such as translation progress.
// create and rename resolve to null when the file name the title maps to is taken.

async function listProjects(): Promise<TProjectEntry[]> {
  return IPC.projects.list();
}

async function readProjectFile(projectId: string): Promise<TProjectFileData> {
  const raw = await IPC.projects.get(projectId);
  if (!raw) throw new Error(t('project.cannotRead'));
  return parseProjectFile(raw);
}

function buildProjectBody(state: RootState): TProjectFileBody {
  const { lines, characterPool } = state.editor;
  return {
    editor: ProjectSaveV1Schema.shape.editor.parse({ lines, characterPool }),
  };
}

// The updated list entry, with the progress the main process computed from the new lines
async function writeProjectBody(projectId: string, state: RootState): Promise<TProjectEntry> {
  return IPC.projects.set(projectId, buildProjectBody(state));
}

type TProjectHeaderInput = {
  projectName: string;
  emoji: string;
  sourceLanguage: TLanguage;
  targetLanguage: TLanguage;
};

// The main process names the file and assigns the projectId. null when the name is taken.
async function createProjectOnDisk(
  header: TProjectHeaderInput,
  body: TProjectFileBody
): Promise<TProjectEntry | null> {
  return IPC.projects.create(header, body);
}

async function renameProjectOnDisk(
  projectId: string,
  projectName: string
): Promise<TProjectEntry | null> {
  return IPC.projects.rename(projectId, projectName);
}

async function updateProjectEmojiOnDisk(projectId: string, emoji: string): Promise<TProjectEntry> {
  return IPC.projects.setEmoji(projectId, emoji);
}

async function updateProjectLanguagesOnDisk(
  projectId: string,
  sourceLanguage: TLanguage,
  targetLanguage: TLanguage
): Promise<TProjectEntry> {
  return IPC.projects.setLanguages(projectId, sourceLanguage, targetLanguage);
}

// The project's device state goes with it: the main process drops a project's entry once its
// file is gone
async function deleteProjectOnDisk(projectId: string): Promise<void> {
  await IPC.projects.delete(projectId);
}

function buildProjectEditorStateSaveData(state: RootState): TProjectStatePrefs {
  return {
    editorMode: state.project.editorMode,
    isVideoCollapsed: state.editor.isVideoCollapsed,
    videoPath: state.project.videoFilePath,
  };
}

async function getProjectEditorState(projectId: string): Promise<TProjectEditorState> {
  const raw = await IPC.projects.getState(projectId);
  return ProjectEditorStateSchema.parse(raw && typeof raw === 'object' ? raw : {});
}

async function writeProjectEditorState(
  projectId: string,
  prefs: TProjectStatePrefs
): Promise<void> {
  await IPC.projects.setState(projectId, prefs);
}

type ProjectState = {
  // The tracked folder's projects, as the main process lists them
  projects: TProjectEntry[];
  currentProjectFilePath: string | null;
  projectId: string | null;
  projectName: string | null;
  emoji: string | null;
  videoFilePath: string | null;
  sourceLanguage: TLanguage | null;
  targetLanguage: TLanguage | null;
  editorMode: 'edit' | 'translate';
};

const initialState: ProjectState = {
  projects: [],
  currentProjectFilePath: null,
  projectId: null,
  projectName: null,
  emoji: null,
  videoFilePath: null,
  sourceLanguage: null,
  targetLanguage: null,
  editorMode: 'translate',
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setProjectList(state, action: PayloadAction<TProjectEntry[]>) {
      state.projects = action.payload;
    },
    // Replaces one project's list item with the entry the main process returned after a write, so
    // the menu shows what the file now holds (name, emoji, progress) without listing the folder
    // again
    setProjectEntry(state, action: PayloadAction<TProjectEntry>) {
      const idx = state.projects.findIndex((p) => p.projectId === action.payload.projectId);
      if (idx >= 0) state.projects[idx] = action.payload;
    },
    setCurrentProjectFilePath(state, action: PayloadAction<string | null>) {
      state.currentProjectFilePath = action.payload;
    },
    setProjectId(state, action: PayloadAction<string | null>) {
      state.projectId = action.payload;
    },
    setProjectName(state, action: PayloadAction<string | null>) {
      state.projectName = action.payload;
    },
    setProjectEmoji(state, action: PayloadAction<string | null>) {
      state.emoji = action.payload;
    },
    setVideoFilePath(state, action: PayloadAction<string | null>) {
      state.videoFilePath = action.payload;
    },
    setProjectSourceLanguage(state, action: PayloadAction<TLanguage | null>) {
      state.sourceLanguage = action.payload;
    },
    setProjectTargetLanguage(state, action: PayloadAction<TLanguage | null>) {
      state.targetLanguage = action.payload;
    },
    setEditorMode(state, action: PayloadAction<'edit' | 'translate'>) {
      state.editorMode = action.payload;
    },
    // Closes the open project only -- the list is the tracked folder's, not the open project's, and
    // is deliberately kept
    resetProject(state): ProjectState {
      return { ...initialState, projects: state.projects };
    },
  },
  selectors: {
    selectProjectList: (state) => state.projects,
    selectCurrentProjectFilePath: (state) => state.currentProjectFilePath,
    selectProjectId: (state) => state.projectId,
    selectProjectName: (state) => state.projectName,
    selectVideoFilePath: (state) => state.videoFilePath,
    selectProjectSourceLanguage: (state) => state.sourceLanguage,
    selectProjectTargetLanguage: (state) => state.targetLanguage,
    selectEditorMode: (state) => state.editorMode,
    selectIsEditMode: (state) => state.editorMode === 'edit',
    selectIsProjectOpen: (state) => state.projectId !== null,
  },
});

const {
  setProjectEntry,
  setCurrentProjectFilePath,
  setProjectId,
  setProjectName,
  setProjectEmoji,
} = projectSlice.actions;

const {
  setProjectList,
  setVideoFilePath,
  setProjectSourceLanguage,
  setProjectTargetLanguage,
  setEditorMode,
  resetProject,
} = projectSlice.actions;

const { selectCurrentProjectFilePath } = projectSlice.selectors;

const {
  selectProjectList,
  selectProjectId,
  selectProjectName,
  selectVideoFilePath,
  selectProjectSourceLanguage,
  selectProjectTargetLanguage,
  selectEditorMode,
  selectIsEditMode,
  selectIsProjectOpen,
} = projectSlice.selectors;

export default projectSlice.reducer;

// ── Thunks ───────────────────────────────────────────────────────────────────

// The list comes from the main process, which renormalizes it against the tracked folder on every
// read, so after any write the renderer just reads it again.
const refreshProjects =
  () =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(setProjectList(await listProjects()));
  };

type CreateNewProjectParams = {
  lines: TSubtitleLine[];
  projectName: string;
  sourceLanguage: TLanguage;
  targetLanguage: TLanguage;
};

const createProject =
  (params: CreateNewProjectParams) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const projectName = params.projectName.trim();
    if (!projectName) throw new Error(t('project.nameRequired'));
    const { sourceLanguage, targetLanguage } = params;

    dispatch(setCurrentProjectFilePath(null));
    dispatch(editor.resetMemoryState());
    dispatch(editor.setVideoCollapsed(false));

    let emoji: string;
    try {
      emoji = await pickRandomCreationEmoji();
    } catch {
      throw new Error(t('createNewProject.emojiSelectionFailed'));
    }

    // The main process names the file and assigns the projectId, so the project exists on disk
    // before anything is applied to the editor
    const editorData = { characterPool: [], lines: params.lines };
    let entry: TProjectEntry | null;
    try {
      entry = await createProjectOnDisk(
        { projectName, emoji, sourceLanguage, targetLanguage },
        { editor: editorData }
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
      editor: editorData,
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
// skipped: createProject creates it. The returned entry carries the progress the main process
// computed from the new lines.
const saveProjectToDisk =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const { projectId } = state.project;
    if (!projectId || !selectCurrentProjectFilePath(state)) return;
    dispatch(setProjectEntry(await writeProjectBody(projectId, state)));
  };

const saveProjectLanguages =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const { projectId, sourceLanguage, targetLanguage } = state.project;
    if (!projectId || !sourceLanguage || !targetLanguage) return;
    if (!selectCurrentProjectFilePath(state)) return;
    dispatch(
      setProjectEntry(await updateProjectLanguagesOnDisk(projectId, sourceLanguage, targetLanguage))
    );
  };

// Saves the currently open project (if any) before tearing down editor/project state to start a
// new one -- no confirmation dialog, the save makes it non-destructive.
const startNewProject =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    if (selectIsProjectOpen(getState())) {
      await dispatch(saveProjectToDisk());
    }
    dispatch(editor.resetMemoryState());
    dispatch(resetProject());
    dispatch(editor.clearFileData());
  };

const loadProjectFromDisk =
  (project: TProjectEntry) =>
  async (dispatch: AppDispatch): Promise<void> => {
    let data: TProjectFileData;
    try {
      data = await readProjectFile(project.projectId);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : t('project.cannotRead'));
    }

    dispatch(setCurrentProjectFilePath(null));
    dispatch(editor.resetMemoryState());

    applyProjectData(dispatch, data);

    let editorState: TProjectEditorState;
    try {
      editorState = await getProjectEditorState(data.project.projectId);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : t('project.editorStateReadFailed'));
    }
    dispatch(setEditorMode(editorState.editorMode));
    dispatch(editor.setVideoCollapsed(editorState.isVideoCollapsed));
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
  dispatch(glossaries.reconcileSelectionWithDirection());
  dispatch(prompt.setFrozenLineNumbers([]));

  dispatch(editor.setCharacterPool(data.editor.characterPool));

  dispatch(editor.setLines(data.editor.lines));
  dispatch(editor.setTotalLinesToTranslate(data.editor.lines.length));
}

const renameProject =
  (projectId: string, newName: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const folder = workingFolder.selectFolder(getState());
    if (!folder) throw new Error(t('project.folderNotTracked'));
    const trimmed = newName.trim();
    if (!trimmed) throw new Error(t('shared.nameEmpty'));

    const entry = await renameProjectOnDisk(projectId, trimmed);
    if (!entry) throw new Error(t('project.alreadyExists'));

    if (projectId === selectProjectId(getState())) {
      dispatch(setCurrentProjectFilePath(entry.filePath));
      dispatch(setProjectName(entry.projectName));
    }

    dispatch(setProjectEntry(entry));
  };

const updateProjectEmoji =
  (projectId: string, emoji: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const entry = await updateProjectEmojiOnDisk(projectId, emoji);

    if (projectId === selectProjectId(getState())) {
      dispatch(setProjectEmoji(entry.emoji));
    }

    dispatch(setProjectEntry(entry));
  };

const deleteProject =
  (projectId: string) =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(workingFolder.setIsBusy(true));
    try {
      await deleteProjectOnDisk(projectId);
      await dispatch(refreshProjects());
      void workingFolder.cleanupMediaCache().catch(() => {});
    } finally {
      dispatch(workingFolder.setIsBusy(false));
    }
  };

// ── API ──────────────────────────────────────────────────────────────────────

export const projects = api('project', {
  buildProjectEditorStateSaveData,
  createProject,
  deleteProject,
  getProjectEditorState,
  loadProjectFromDisk,
  refreshProjects,
  renameProject,
  resetProject,
  saveProjectLanguages,
  saveProjectToDisk,
  selectEditorMode,
  selectIsEditMode,
  selectIsProjectOpen,
  selectProjectId,
  selectProjectList,
  selectProjectName,
  selectProjectSourceLanguage,
  selectProjectTargetLanguage,
  selectVideoFilePath,
  setEditorMode,
  setProjectList,
  setProjectSourceLanguage,
  setProjectTargetLanguage,
  setVideoFilePath,
  startNewProject,
  updateProjectEmoji,
  writeProjectEditorState,
});

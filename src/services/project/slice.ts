import {
  PROJECT_TEMPO_DEFAULTS,
  type TProjectListEntry,
  type TProjectTempo,
} from '@bridge/definitions/projectEntry';
import type { TProjectSpellcheck } from '@bridge/definitions/spellcheckDictionary';
import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TLanguage } from '@src/types';
import { folder } from '@src/services/folder';

export type TProjectEntry = TProjectListEntry;

type ProjectState = {
  // The tracked folder's projects, as the main process lists them
  projects: TProjectEntry[];
  currentProjectFilePath: string | null;
  projectId: string | null;
  projectName: string | null;
  emoji: string | null;
  sourceLanguage: TLanguage | null;
  targetLanguage: TLanguage | null;
  // The open project's subtitle limits: file content (saved by autosave.ts, with its own debounce)
  // but not editor history, which is why they live here and not in the editor slice
  tempo: TProjectTempo;
  // The Archive overlay, listing the hidden projects
  isArchiveOpen: boolean;
};

const initialState: ProjectState = {
  projects: [],
  currentProjectFilePath: null,
  projectId: null,
  projectName: null,
  emoji: null,
  sourceLanguage: null,
  targetLanguage: null,
  tempo: PROJECT_TEMPO_DEFAULTS,
  isArchiveOpen: false,
};

const selectProjects = (state: ProjectState) => state.projects;

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
    setProjectSourceLanguage(state, action: PayloadAction<TLanguage | null>) {
      state.sourceLanguage = action.payload;
    },
    setProjectTargetLanguage(state, action: PayloadAction<TLanguage | null>) {
      state.targetLanguage = action.payload;
    },
    // Any subset of the limits; the rest keep their values
    setProjectTempo(state, action: PayloadAction<Partial<TProjectTempo>>) {
      state.tempo = { ...state.tempo, ...action.payload };
    },
    // A project's file was loaded (opened or just created). Changes nothing here: it's for services
    // that keep part of the file themselves (the spellcheck service, the project's dictionary),
    // since this service doesn't import them.
    fileLoaded(_state, _action: PayloadAction<{ spellcheck: TProjectSpellcheck }>) {},
    setArchiveOpen(state, action: PayloadAction<boolean>) {
      state.isArchiveOpen = action.payload;
    },
    // Closes the open project only -- the list is the tracked folder's, not the open project's, and
    // is deliberately kept, as is the Archive overlay, which lists it
    resetProject(state): ProjectState {
      return { ...initialState, projects: state.projects, isArchiveOpen: state.isArchiveOpen };
    },
  },
  extraReducers(builder) {
    // Another folder: the open project belonged to the old one. The list is refreshed by the scan.
    builder.addCase(folder.pathChanged, (state): ProjectState => ({
      ...initialState,
      projects: state.projects,
    }));
  },
  selectors: {
    // Every project, archived ones included: their files still exist (e.g. for name checks)
    selectProjectList: (state) => state.projects,
    // What the menu lists, in the main process's order
    selectVisibleProjectList: createSelector([selectProjects], (projects) =>
      projects.filter((project) => !project.hidden)
    ),
    // What the Archive overlay lists, alphabetically
    selectArchivedProjectList: createSelector([selectProjects], (projects) =>
      projects
        .filter((project) => project.hidden)
        .sort((a, b) => a.projectName.localeCompare(b.projectName))
    ),
    selectHasArchivedProjects: (state) => state.projects.some((project) => project.hidden),
    selectIsArchiveOpen: (state) => state.isArchiveOpen,
    selectCurrentProjectFilePath: (state) => state.currentProjectFilePath,
    selectProjectId: (state) => state.projectId,
    selectProjectName: (state) => state.projectName,
    selectProjectSourceLanguage: (state) => state.sourceLanguage,
    selectProjectTargetLanguage: (state) => state.targetLanguage,
    selectProjectTempo: (state) => state.tempo,
    selectIsProjectTempoEnabled: (state) => state.tempo.enabled,
    selectIsProjectOpen: (state) => state.projectId !== null,
  },
});

export const {
  setProjectEntry,
  setCurrentProjectFilePath,
  setProjectId,
  setProjectName,
  setProjectEmoji,
  setProjectList,
  setProjectSourceLanguage,
  setProjectTargetLanguage,
  setProjectTempo,
  setArchiveOpen,
  fileLoaded,
  resetProject,
} = projectSlice.actions;

export const {
  selectCurrentProjectFilePath,
  selectProjectList,
  selectVisibleProjectList,
  selectArchivedProjectList,
  selectHasArchivedProjects,
  selectIsArchiveOpen,
  selectProjectId,
  selectProjectName,
  selectProjectSourceLanguage,
  selectProjectTargetLanguage,
  selectProjectTempo,
  selectIsProjectTempoEnabled,
  selectIsProjectOpen,
} = projectSlice.selectors;

export default projectSlice.reducer;

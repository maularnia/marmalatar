import type { TProjectStatePrefs } from '@bridge/definitions/projectState';
import { pushMessage } from '@providers/bridges/messages';
import { navigate } from '@providers/bridges/navigation';
import i18n from '@src/i18n';
import {
  emitAudioExtractionFailedMessage,
  emitProjectCreationAbortedMessage,
  emitProjectLoadedMessage,
  emitProjectLoadFailedMessage,
  emitProjectStateReadFailedMessage,
  emitThumbnailGenerationFailedMessage,
  emitVideoFileCheckFailedMessage,
  emitVideoFileMissingMessage,
  emitVideoPathRemovalFailedMessage,
  emitVideoPathSaveFailedMessage,
  emitWaveformExtractionFailedMessage,
} from '@src/messages';
import { confirmDeleteProject } from '@src/segments/dialogs/deleteProject/deleteProjectConfirmation';
import { load } from '@src/segments/dialogs/loader/loader';
import { selectVideo } from '@src/segments/dialogs/videoSelect/videoSelection';
import { IPC } from '@src/services/ipc/IPC';
import { media } from '@src/services/media';
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
import { toErrorMessage } from '@src/utils/toErrorMessage';
import { dispatch, select } from '@store/createApi';
import { glossaries } from '@src/services/glossary';
import { workingFolder } from '@store/slices/workingFolder';
import { clearSplitCursor } from './editor/actions';
import {
  clearFileData,
  resetEditorMemoryState,
  selectCharacterPool,
  selectEditorMode,
  selectIsVideoCollapsed,
  selectLines,
  setCharacterPool,
  setEditorMode,
  setFrozenLineNumbers,
  setLines,
  setTotalLinesToTranslate,
  setVideoCollapsed,
} from './editor/slice';
import {
  resetProject,
  selectCurrentProjectFilePath,
  selectIsProjectOpen,
  selectProjectId,
  selectProjectSourceLanguage,
  selectProjectTargetLanguage,
  setCurrentProjectFilePath,
  setProjectEmoji,
  setProjectEntry,
  setProjectId,
  setProjectList,
  setProjectName,
  setProjectSourceLanguage,
  setProjectTargetLanguage,
  type TProjectEntry,
} from './slice';

// The project service's operations: the open project's file and device preferences, and the
// whole open/create/start-new/delete flows, navigation included. They work on the project and
// editor slices directly (their own actions and selectors, and the editor's actions module), never
// through this service's facades: index.ts builds those from these files, so importing it here
// would be a cycle.

const t = i18n.getFixedT(null, 'errors');
const tDialogs = i18n.getFixedT(null, 'dialogs');
const tMessages = i18n.getFixedT(null, 'messages');

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

function buildProjectBody(): TProjectFileBody {
  return {
    editor: ProjectSaveV1Schema.shape.editor.parse({
      lines: select(selectLines),
      characterPool: select(selectCharacterPool),
    }),
  };
}

// The updated list entry, with the progress the main process computed from the new lines
async function writeProjectBody(projectId: string): Promise<TProjectEntry> {
  return IPC.projects.set(projectId, buildProjectBody());
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

// The preferences the store holds. The audio track isn't among them yet, and set-state keeps
// whatever isn't sent.
export function buildProjectEditorStateSaveData(): Omit<TProjectStatePrefs, 'audioTrackId'> {
  return {
    editorMode: select(selectEditorMode),
    isVideoCollapsed: select(selectIsVideoCollapsed),
    videoPath: media.get.videoFilePath(),
  };
}

async function getProjectEditorState(projectId: string): Promise<TProjectEditorState> {
  const raw = await IPC.projects.getState(projectId);
  return ProjectEditorStateSchema.parse(raw && typeof raw === 'object' ? raw : {});
}

// Writes the given preferences only; the main process keeps the rest
export async function writeProjectEditorState(
  projectId: string,
  prefs: Partial<TProjectStatePrefs>
): Promise<void> {
  await IPC.projects.setState(projectId, prefs);
}

// ── Video path ───────────────────────────────────────────────────────────────

/** Remembers the project's video on this device. A different video also drops the chosen audio
 * track; the main process takes care of it. */
export async function saveProjectVideoPath(
  projectId: string,
  videoPath: string | null
): Promise<void> {
  if (!videoPath) return;
  try {
    await writeProjectEditorState(projectId, { videoPath });
    void workingFolder.cleanupMediaCache().catch(() => {});
  } catch (err) {
    emitVideoPathSaveFailedMessage(pushMessage, toErrorMessage(err));
  }
}

export async function removeProjectVideoPath(projectId: string): Promise<void> {
  try {
    await writeProjectEditorState(projectId, { videoPath: null });
    void workingFolder.cleanupMediaCache().catch(() => {});
  } catch (err) {
    emitVideoPathRemovalFailedMessage(pushMessage, toErrorMessage(err));
  }
}

// ── List and file ────────────────────────────────────────────────────────────

// The list comes from the main process, which renormalizes it against the tracked folder on every
// read, so after any write the renderer just reads it again.
export async function refreshProjects(): Promise<void> {
  dispatch(setProjectList(await listProjects()));
}

// Writes the open project's lines and characters to its file. A project without a file yet is
// skipped: createProject creates it. The returned entry carries the progress the main process
// computed from the new lines.
export async function saveProjectToDisk(): Promise<void> {
  const projectId = select(selectProjectId);
  if (!projectId || !select(selectCurrentProjectFilePath)) return;
  dispatch(setProjectEntry(await writeProjectBody(projectId)));
}

export async function saveProjectLanguages(): Promise<void> {
  const projectId = select(selectProjectId);
  const sourceLanguage = select(selectProjectSourceLanguage);
  const targetLanguage = select(selectProjectTargetLanguage);
  if (!projectId || !sourceLanguage || !targetLanguage) return;
  if (!select(selectCurrentProjectFilePath)) return;
  dispatch(
    setProjectEntry(await updateProjectLanguagesOnDisk(projectId, sourceLanguage, targetLanguage))
  );
}

export async function renameProject(projectId: string, newName: string): Promise<void> {
  const folder = workingFolder.get.folder();
  if (!folder) throw new Error(t('project.folderNotTracked'));
  const trimmed = newName.trim();
  if (!trimmed) throw new Error(t('shared.nameEmpty'));

  const entry = await renameProjectOnDisk(projectId, trimmed);
  if (!entry) throw new Error(t('project.alreadyExists'));

  if (projectId === select(selectProjectId)) {
    dispatch(setCurrentProjectFilePath(entry.filePath));
    dispatch(setProjectName(entry.projectName));
  }

  dispatch(setProjectEntry(entry));
}

export async function updateProjectEmoji(projectId: string, emoji: string): Promise<void> {
  const entry = await updateProjectEmojiOnDisk(projectId, emoji);
  if (projectId === select(selectProjectId)) {
    dispatch(setProjectEmoji(entry.emoji));
  }
  dispatch(setProjectEntry(entry));
}

// ── Open project state ───────────────────────────────────────────────────────

// Clears what belongs to the previously open project before another one is applied
function resetOpenProjectMemory(): void {
  dispatch(setCurrentProjectFilePath(null));
  dispatch(resetEditorMemoryState());
  clearSplitCursor();
  media.resetPlayback();
}

function applyProjectData(data: Pick<TProjectFileData, 'project' | 'editor'>): void {
  dispatch(setProjectId(data.project.projectId));
  dispatch(setProjectName(data.project.projectName));
  dispatch(setProjectEmoji(data.project.emoji));

  dispatch(setProjectSourceLanguage(data.project.sourceLanguage));
  dispatch(setProjectTargetLanguage(data.project.targetLanguage));
  glossaries.reconcileSelectionWithDirection();
  dispatch(setFrozenLineNumbers([]));

  dispatch(setCharacterPool(data.editor.characterPool));

  dispatch(setLines(data.editor.lines));
  dispatch(setTotalLinesToTranslate(data.editor.lines.length));
}

/** Closes the open project and its video. The project list is the tracked folder's and stays. */
export function closeProject(): void {
  dispatch(resetProject());
  media.clearVideo();
}

async function loadProjectFromDisk(project: TProjectEntry): Promise<void> {
  let data: TProjectFileData;
  try {
    data = await readProjectFile(project.projectId);
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : t('project.cannotRead'));
  }

  resetOpenProjectMemory();
  applyProjectData(data);

  let editorState: TProjectEditorState;
  try {
    editorState = await getProjectEditorState(data.project.projectId);
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : t('project.editorStateReadFailed'));
  }
  dispatch(setEditorMode(editorState.editorMode));
  dispatch(setVideoCollapsed(editorState.isVideoCollapsed));
  // Restore the video that was attached when the project was last saved/closed.
  media.setVideoFilePath(editorState.videoPath);

  dispatch(setCurrentProjectFilePath(project.filePath));
}

// ── Open ─────────────────────────────────────────────────────────────────────

type TVideoMedia = {
  videoPath: string | null;
  audioPath: string | null;
  waveformPeaks: number[];
  previewImage: string | null;
};

const NO_VIDEO: TVideoMedia = {
  videoPath: null,
  audioPath: null,
  waveformPeaks: [],
  previewImage: null,
};

async function applyLoadedProject(project: TProjectEntry, video: TVideoMedia): Promise<void> {
  try {
    await loadProjectFromDisk(project);
  } catch (error) {
    emitProjectLoadFailedMessage(pushMessage, toErrorMessage(error));
    return;
  }

  media.loadVideo(video.videoPath, video.audioPath ?? undefined);
  media.setVideoData({ thumbnail: video.previewImage, waveformPeaks: video.waveformPeaks });
  media.resetPlayback();

  emitProjectLoadedMessage(pushMessage);
  navigate('/workspace');
}

// Prompts the user to reselect the video (used whenever a step of opening fails) and either
// continues without video or opens with the new pick, which the dialog already validated and
// converted.
async function openWithReselectedVideo(project: TProjectEntry, bannerKey: string): Promise<void> {
  const result = await selectVideo(
    tDialogs(bannerKey),
    tDialogs('videoSelect.continueWithoutVideoButton')
  );
  if (!result) {
    await removeProjectVideoPath(project.projectId);
    await applyLoadedProject(project, NO_VIDEO);
    return;
  }
  await saveProjectVideoPath(project.projectId, result.videoPath);
  await applyLoadedProject(project, result);
}

// Extracts what the editor needs from the saved video: audio, waveform and thumbnail. null when a
// step failed (already reported).
async function extractVideoMedia(
  videoPath: string
): Promise<Omit<TVideoMedia, 'videoPath'> | null> {
  let audioPath: string;
  try {
    audioPath = await IPC.media.extractAudio(videoPath);
  } catch (error) {
    emitAudioExtractionFailedMessage(pushMessage, toErrorMessage(error));
    return null;
  }

  let waveformPeaks: number[];
  try {
    waveformPeaks = await IPC.media.extractWaveformPeaks(videoPath);
  } catch (error) {
    emitWaveformExtractionFailedMessage(pushMessage, toErrorMessage(error));
    return null;
  }

  let previewImage: string | null;
  try {
    previewImage = await IPC.media.generateThumbnail(videoPath);
  } catch (error) {
    emitThumbnailGenerationFailedMessage(pushMessage, toErrorMessage(error));
    return null;
  }

  return { audioPath, waveformPeaks, previewImage };
}

/** Opens a project with its saved video (asking for another one when it's missing or can't be
 * processed), then shows the editor. */
export async function openProject(project: TProjectEntry): Promise<void> {
  let editorState: TProjectEditorState;
  try {
    editorState = await getProjectEditorState(project.projectId);
  } catch (error) {
    emitProjectStateReadFailedMessage(pushMessage, toErrorMessage(error));
    return;
  }
  const savedPath = editorState.videoPath;

  // No video was ever selected for this device: open without one
  if (!savedPath) {
    await applyLoadedProject(project, NO_VIDEO);
    return;
  }

  // Saved path: verify it exists, then process it in the main process
  let fileExists: boolean;
  try {
    fileExists = await workingFolder.checkForeignFileExists(savedPath);
  } catch (error) {
    emitVideoFileCheckFailedMessage(pushMessage, toErrorMessage(error));
    fileExists = false;
  }
  if (!fileExists) {
    emitVideoFileMissingMessage(pushMessage);
    await openWithReselectedVideo(project, 'videoSelect.savedFileNotFoundBanner');
    return;
  }

  const extracted = await load(
    {
      messages: [
        tMessages('projectLoader.loadingVideo'),
        tMessages('projectLoader.blamingProcessor'),
        tMessages('projectLoader.reevaluatingExpectations'),
        tMessages('projectLoader.computingWaveforms'),
        tMessages('projectLoader.surfingWaveforms'),
        tMessages('projectLoader.demandingRam'),
      ],
    },
    extractVideoMedia(savedPath)
  );
  if (!extracted) {
    await openWithReselectedVideo(project, 'videoSelect.processingFailedBanner');
    return;
  }

  await applyLoadedProject(project, { videoPath: savedPath, ...extracted });
}

// ── Create and start new ─────────────────────────────────────────────────────

type TCreateProjectParams = {
  lines: TSubtitleLine[];
  projectName: string;
  sourceLanguage: TLanguage;
  targetLanguage: TLanguage;
};

async function createProjectFromLines(params: TCreateProjectParams): Promise<void> {
  const projectName = params.projectName.trim();
  if (!projectName) throw new Error(t('project.nameRequired'));
  const { sourceLanguage, targetLanguage } = params;

  resetOpenProjectMemory();
  dispatch(setVideoCollapsed(false));

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

  applyProjectData({
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
    await writeProjectEditorState(entry.projectId, buildProjectEditorStateSaveData());
  } catch {
    throw new Error(t('createNewProject.editorStateSaveFailed'));
  }

  try {
    await refreshProjects();
  } catch {
    throw new Error(t('createNewProject.cacheUpdateFailed'));
  }
}

/** Creates a project from imported lines (the video was already attached by the import page),
 * then shows the editor. Failures are reported, not thrown. */
export async function createProject(params: TCreateProjectParams): Promise<void> {
  if (!workingFolder.get.folder()) return;
  try {
    await load(
      {
        messages: [
          tMessages('submitNewProject.creatingProject'),
          'Counting subtitle entries',
          'Blamin processor for slow performance',
          'Re-evaluating expectations',
          'Computing waveforms',
          'Surfing on waveforms',
          'Demanding more RAM',
        ],
      },
      createProjectFromLines(params)
    );
    navigate('/workspace');
  } catch (error) {
    emitProjectCreationAbortedMessage(
      pushMessage,
      error instanceof Error ? error.message : undefined
    );
  }
}

/** Saves and closes the open project, if any, and goes to the import page. No confirmation: the
 * save makes it non-destructive. The editor's line inputs clean themselves as the rows unmount. */
export async function startNewProject(): Promise<void> {
  if (select(selectIsProjectOpen)) {
    await saveProjectToDisk();
    dispatch(resetEditorMemoryState());
    clearSplitCursor();
    media.resetPlayback();
    closeProject();
    dispatch(clearFileData());
  }
  navigate('/intro/import');
}

// ── Delete ───────────────────────────────────────────────────────────────────

/** Asks, then deletes a project's file. Deleting the open project closes it and leaves the
 * editor. Resolves whether it was deleted. */
export async function deleteProject(projectId: string, projectName: string): Promise<boolean> {
  if (!(await confirmDeleteProject(projectName))) return false;
  const wasOpen = projectId === select(selectProjectId);
  workingFolder.setIsBusy(true);
  try {
    await deleteProjectOnDisk(projectId);
    await refreshProjects();
    void workingFolder.cleanupMediaCache().catch(() => {});
  } finally {
    workingFolder.setIsBusy(false);
  }
  if (wasOpen) {
    closeProject();
    navigate('/');
  }
  return true;
}

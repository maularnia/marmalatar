import { useInfoWindow } from '@providers/ConfirmationProvider/ConfirmationProvider';
import { useVideo } from '@providers/VideoProvider';
import {
  checkExternalPathExists,
  getProjectEditorState,
  TProjectCacheEntry,
} from '@src/utils/data/discIO';
import { usePersistVideoPath } from '@src/utils/usePersistVideoPath';
import {
  emitProjectLoadedMessage,
  emitProjectLoadFailedMessage,
  emitVideoFileMissingMessage,
  emitVideoProcessingFailedMessage,
} from '@src/messages';
import { useMessageHelmet } from '@src/providers/MessageHelmetProvider';
import { useVideoSelectDialog } from '@src/segments/dialogs/videoSelect/useVideoSelectDialog';
import { useAppDispatch } from '@store/hooks';
import { loadProjectFromDisk } from '@store/thunks';
import { processVideoPath } from '@utils/processVideoPath';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Loader } from '../../dialogs/Loader';

export function useProjectLoader() {
  const { t } = useTranslation(['dialogs', 'messages']);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { setVideoData, setVideoFilePath, resetCurrentTime } = useVideo();
  const { pushMessage } = useMessageHelmet();
  const { selectVideo } = useVideoSelectDialog();
  const { persistVideoPath, removeVideoPath } = usePersistVideoPath();
  const { show: showInfo } = useInfoWindow(Loader);

  const loadProject = useCallback(
    async (project: TProjectCacheEntry) => {
      const editorState = await getProjectEditorState(project.project.projectId);
      const savedPath = editorState.videoPath;

      // ── No video was ever selected for this device: load without one ───────
      if (!savedPath) {
        await applyAndNavigate(project, null, [], null);
        return;
      }

      // ── Saved path: verify existence, then process via backend ─────────────
      const fileExists = await checkExternalPathExists(savedPath);
      if (!fileExists) {
        emitVideoFileMissingMessage(pushMessage);
        const result = await selectVideo(
          t('videoSelect.savedFileNotFoundBanner'),
          t('videoSelect.continueWithoutVideoButton')
        );
        if (!result) {
          await removeVideoPath(project.project.projectId);
          await applyAndNavigate(project, null, [], null);
          return;
        }
        await persistVideoPath(project.project.projectId, result.videoPath);
        await applyAndNavigate(
          project,
          result.videoPath,
          result.waveformPeaks,
          result.previewImage
        );
        return;
      }

      let waveformPeaks: number[];
      let previewImage: string | null;
      try {
        ({ waveformPeaks, previewImage } = await showInfo(
          { message: t('messages:projectLoader.loadingVideo'), animate: false },
          processVideoPath(savedPath)
        ));
      } catch {
        emitVideoProcessingFailedMessage(pushMessage);
        const result = await selectVideo(
          t('videoSelect.processingFailedBanner'),
          t('videoSelect.continueWithoutVideoButton')
        );
        if (!result) {
          await removeVideoPath(project.project.projectId);
          await applyAndNavigate(project, null, [], null);
          return;
        }
        await persistVideoPath(project.project.projectId, result.videoPath);
        await applyAndNavigate(
          project,
          result.videoPath,
          result.waveformPeaks,
          result.previewImage
        );
        return;
      }

      await applyAndNavigate(project, savedPath, waveformPeaks, previewImage);

      async function applyAndNavigate(
        proj: TProjectCacheEntry,
        videoPath: string | null,
        peaks: number[],
        preview: string | null
      ) {
        const loadError = (await dispatch(loadProjectFromDisk(proj.filePath))) as string | null;
        if (loadError) {
          emitProjectLoadFailedMessage(pushMessage, loadError);
          return;
        }

        setVideoFilePath(videoPath);
        setVideoData(preview, peaks);
        resetCurrentTime();

        emitProjectLoadedMessage(pushMessage);
        navigate('/workspace');
      }
    },
    [
      dispatch,
      navigate,
      setVideoFilePath,
      setVideoData,
      resetCurrentTime,
      pushMessage,
      selectVideo,
      showInfo,
      persistVideoPath,
      removeVideoPath,
      t,
    ]
  );

  return { loadProject };
}

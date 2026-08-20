import { useInfoWindow } from '@providers/ConfirmationProvider/ConfirmationProvider';
import { useVideo } from '@providers/VideoProvider';
import {
  checkExternalPathExists,
  getProjectEditorState,
  TProjectCacheEntry,
} from '@src/utils/data/discIO';
import { usePersistVideoPath } from '@src/utils/usePersistVideoPath';
import {
  emitAudioExtractionFailedMessage,
  emitProjectLoadedMessage,
  emitProjectLoadFailedMessage,
  emitVideoFileMissingMessage,
  emitVideoProcessingFailedMessage,
} from '@src/messages';
import { useMessageHelmet } from '@src/providers/MessageHelmetProvider';
import { useVideoSelectDialog } from '@src/segments/dialogs/videoSelect/useVideoSelectDialog';
import { toErrorMessage } from '@src/utils/toErrorMessage';
import { useAppDispatch } from '@store/hooks';
import { loadProjectFromDisk } from '@store/thunks';
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
        await applyAndNavigate(project, null, null, [], null);
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
          await applyAndNavigate(project, null, null, [], null);
          return;
        }
        await persistVideoPath(project.project.projectId, result.videoPath);
        await applyAndNavigate(
          project,
          result.videoPath,
          result.audioPath,
          result.waveformPeaks,
          result.previewImage
        );
        return;
      }

      let audioPath: string;
      let waveformPeaks: number[];
      let previewImage: string | null;
      try {
        ({ audioPath, waveformPeaks, previewImage } = await showInfo(
          { message: t('messages:projectLoader.loadingVideo'), animate: false },
          (async () => {
            const resolvedAudioPath = await window.electronAPI.extractOrConvertAudio(savedPath);
            const [peaks, preview] = await Promise.all([
              window.electronAPI.extractWaveformPeaks(resolvedAudioPath),
              window.electronAPI.generateThumbnail(savedPath).catch(() => null),
            ]);
            return { audioPath: resolvedAudioPath, waveformPeaks: peaks, previewImage: preview };
          })()
        ));
      } catch (error) {
        emitVideoProcessingFailedMessage(pushMessage);
        emitAudioExtractionFailedMessage(pushMessage, toErrorMessage(error));
        const result = await selectVideo(
          t('videoSelect.processingFailedBanner'),
          t('videoSelect.continueWithoutVideoButton')
        );
        if (!result) {
          await removeVideoPath(project.project.projectId);
          await applyAndNavigate(project, null, null, [], null);
          return;
        }
        await persistVideoPath(project.project.projectId, result.videoPath);
        await applyAndNavigate(
          project,
          result.videoPath,
          result.audioPath,
          result.waveformPeaks,
          result.previewImage
        );
        return;
      }

      await applyAndNavigate(project, savedPath, audioPath, waveformPeaks, previewImage);

      async function applyAndNavigate(
        proj: TProjectCacheEntry,
        videoPath: string | null,
        audioPath: string | null,
        peaks: number[],
        preview: string | null
      ) {
        const loadError = (await dispatch(loadProjectFromDisk(proj.filePath))) as string | null;
        if (loadError) {
          emitProjectLoadFailedMessage(pushMessage, loadError);
          return;
        }

        setVideoFilePath(videoPath, audioPath ?? undefined);
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

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
  emitProjectStateReadFailedMessage,
  emitThumbnailGenerationFailedMessage,
  emitVideoFileCheckFailedMessage,
  emitVideoFileMissingMessage,
  emitWaveformExtractionFailedMessage,
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
      async function applyAndNavigate(
        proj: TProjectCacheEntry,
        videoPath: string | null,
        audioPath: string | null,
        peaks: number[],
        preview: string | null
      ) {
        try {
          await dispatch(loadProjectFromDisk(proj.filePath));
        } catch (error) {
          emitProjectLoadFailedMessage(pushMessage, toErrorMessage(error));
          return;
        }

        setVideoFilePath(videoPath, audioPath ?? undefined);
        setVideoData(preview, peaks);
        resetCurrentTime();

        emitProjectLoadedMessage(pushMessage);
        navigate('/workspace');
      }

      // Prompts the user to reselect the video (used whenever a step below fails) and either
      // continues without video or re-runs the full validation/conversion flow on the new pick.
      async function offerReselect(bannerKey: string) {
        const result = await selectVideo(t(bannerKey), t('videoSelect.continueWithoutVideoButton'));
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
      }

      let editorState: Awaited<ReturnType<typeof getProjectEditorState>>;
      try {
        editorState = await getProjectEditorState(project.project.projectId);
      } catch (error) {
        emitProjectStateReadFailedMessage(pushMessage, toErrorMessage(error));
        return;
      }
      const savedPath = editorState.videoPath;

      // ── No video was ever selected for this device: load without one ───────
      if (!savedPath) {
        await applyAndNavigate(project, null, null, [], null);
        return;
      }

      // ── Saved path: verify existence, then process via backend ─────────────
      let fileExists: boolean;
      try {
        fileExists = await checkExternalPathExists(savedPath);
      } catch (error) {
        emitVideoFileCheckFailedMessage(pushMessage, toErrorMessage(error));
        fileExists = false;
      }
      if (!fileExists) {
        emitVideoFileMissingMessage(pushMessage);
        await offerReselect('videoSelect.savedFileNotFoundBanner');
        return;
      }

      const result = await showInfo(
        { message: t('messages:projectLoader.loadingVideo'), animate: false },
        (async (): Promise<{
          audioPath: string;
          waveformPeaks: number[];
          previewImage: string | null;
        } | null> => {
          let audioPath: string;
          try {
            audioPath = await window.electronAPI.extractOrConvertAudio(savedPath);
          } catch (error) {
            emitAudioExtractionFailedMessage(pushMessage, toErrorMessage(error));
            return null;
          }

          let waveformPeaks: number[];
          try {
            waveformPeaks = await window.electronAPI.extractWaveformPeaks(audioPath);
          } catch (error) {
            emitWaveformExtractionFailedMessage(pushMessage, toErrorMessage(error));
            return null;
          }

          let previewImage: string | null;
          try {
            previewImage = await window.electronAPI.generateThumbnail(savedPath);
          } catch (error) {
            emitThumbnailGenerationFailedMessage(pushMessage, toErrorMessage(error));
            return null;
          }

          return { audioPath, waveformPeaks, previewImage };
        })()
      );

      if (!result) {
        await offerReselect('videoSelect.processingFailedBanner');
        return;
      }

      await applyAndNavigate(
        project,
        savedPath,
        result.audioPath,
        result.waveformPeaks,
        result.previewImage
      );
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

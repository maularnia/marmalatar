import { useVideo } from '@providers/VideoProvider';
import { useVideoSelectDialog } from '@src/segments/dialogs/videoSelect/useVideoSelectDialog';
import { emitVideoUpdatedMessage } from '@src/messages';
import { useMessageHelmet } from '@src/providers/MessageHelmetProvider';
import { usePersistVideoPath } from '@src/utils/usePersistVideoPath';
import { editor } from '@src/services/editor';
import { projects } from '@src/store/slices/project';
import { useCallback, useRef } from 'react';

export function useVideoFileSwap() {
  const { selectVideo } = useVideoSelectDialog();
  const { persistVideoPath } = usePersistVideoPath();
  const { setVideoFilePath, setVideoData, videoElementRef, seekToLine } = useVideo();
  const { pushMessage } = useMessageHelmet();
  const busyRef = useRef(false);

  const swapVideo = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const result = await selectVideo();
      if (!result) return;

      const projectId = projects.get.id();
      if (projectId) await persistVideoPath(projectId, result.videoPath);

      const video = videoElementRef.current;
      const onLoadedMetadata = () => {
        video?.removeEventListener('loadedmetadata', onLoadedMetadata);
        const activeLineIndex = editor.get.activeLineIndex();
        if (activeLineIndex != null) seekToLine(activeLineIndex);
      };
      video?.addEventListener('loadedmetadata', onLoadedMetadata);

      setVideoFilePath(result.videoPath, result.audioPath);
      setVideoData(result.previewImage, result.waveformPeaks);

      emitVideoUpdatedMessage(pushMessage);
    } finally {
      busyRef.current = false;
    }
  }, [
    selectVideo,
    persistVideoPath,
    videoElementRef,
    seekToLine,
    setVideoFilePath,
    setVideoData,
    pushMessage,
  ]);

  return { swapVideo };
}

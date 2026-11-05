import { media } from '@src/services/media';
import { selectVideo } from '@src/segments/dialogs/videoSelect/videoSelection';
import { emitVideoUpdatedMessage } from '@src/messages';
import { useMessageHelmet } from '@src/providers/MessageHelmetProvider';
import { projects } from '@src/services/project';
import { useCallback, useRef } from 'react';

export function useVideoFileSwap() {
  const { pushMessage } = useMessageHelmet();
  const busyRef = useRef(false);

  const swapVideo = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const result = await selectVideo();
      if (!result) return;

      const projectId = projects.get.id();
      if (projectId) await projects.saveVideoPath(projectId, result.videoPath);

      const video = media.getVideoElement();
      const onLoadedMetadata = () => {
        video?.removeEventListener('loadedmetadata', onLoadedMetadata);
        const activeLineIndex = media.get.activeLineIndex();
        if (activeLineIndex != null) media.seekToLine(activeLineIndex);
      };
      video?.addEventListener('loadedmetadata', onLoadedMetadata);

      media.loadVideo(result.videoPath, result.audioPath);
      media.setVideoData({ thumbnail: result.previewImage, waveformPeaks: result.waveformPeaks });

      emitVideoUpdatedMessage(pushMessage);
    } finally {
      busyRef.current = false;
    }
  }, [pushMessage]);

  return { swapVideo };
}

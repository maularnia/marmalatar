import { emitVideoPathRemovalFailedMessage, emitVideoPathSaveFailedMessage } from '@src/messages';
import { useMessageHelmet } from '@src/providers/MessageHelmetProvider';
import { workingFolder } from '@store/slices/workingFolder';
import { projects } from '@store/slices/project';
import { useCallback } from 'react';

export function usePersistVideoPath() {
  const { pushMessage } = useMessageHelmet();

  const persistVideoPath = useCallback(
    async (projectId: string, videoPath: string | null) => {
      if (!videoPath) return;
      try {
        // A different video also drops the chosen audio track; the main process takes care of it
        await projects.writeEditorState(projectId, { videoPath });
        void workingFolder.cleanupMediaCache().catch(() => {});
      } catch (err) {
        emitVideoPathSaveFailedMessage(
          pushMessage,
          err instanceof Error ? err.message : 'Unknown error.'
        );
      }
    },
    [pushMessage]
  );

  const removeVideoPath = useCallback(
    async (projectId: string) => {
      try {
        await projects.writeEditorState(projectId, { videoPath: null });
        void workingFolder.cleanupMediaCache().catch(() => {});
      } catch (err) {
        emitVideoPathRemovalFailedMessage(
          pushMessage,
          err instanceof Error ? err.message : 'Unknown error.'
        );
      }
    },
    [pushMessage]
  );

  return { persistVideoPath, removeVideoPath };
}

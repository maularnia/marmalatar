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
        const current = await projects.getEditorState(projectId);
        await projects.writeEditorState(projectId, { ...current, videoPath });
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
        const current = await projects.getEditorState(projectId);
        await projects.writeEditorState(projectId, { ...current, videoPath: null });
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

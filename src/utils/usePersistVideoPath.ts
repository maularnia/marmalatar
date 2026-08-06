import { emitVideoPathRemovalFailedMessage, emitVideoPathSaveFailedMessage } from '@src/messages';
import { useMessageHelmet } from '@src/providers/MessageHelmetProvider';
import { getProjectEditorState, writeProjectEditorState } from '@src/utils/data/discIO';
import { useCallback } from 'react';

export function usePersistVideoPath() {
  const { pushMessage } = useMessageHelmet();

  const persistVideoPath = useCallback(
    async (projectId: string, videoPath: string | null) => {
      if (!videoPath) return;
      try {
        const current = await getProjectEditorState(projectId);
        await writeProjectEditorState(projectId, { ...current, videoPath });
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
        const current = await getProjectEditorState(projectId);
        await writeProjectEditorState(projectId, { ...current, videoPath: null });
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

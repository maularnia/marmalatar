import { useConfirm } from '@providers/ConfirmationProvider/ConfirmationProvider';
import i18n from '@src/i18n';
import { useCallback, useRef } from 'react';
import VideoSelectDialog, { VideoSelectDialogProps, VideoSelectResult } from './VideoSelectDialog';

const t = i18n.getFixedT(null, 'dialogs');

export function useVideoSelectDialog() {
  const resultRef = useRef<VideoSelectResult | null>(null);
  const isValidRef = useRef(false);

  const { confirm, destroy } = useConfirm(VideoSelectDialog, {
    confirmButton: { children: t('shared.continue') },
    dismissButton: { children: t('shared.cancel') },
  });

  const selectVideo = useCallback(
    async (
      errorMessage?: string | null,
      dismissLabel?: string
    ): Promise<VideoSelectResult | null> => {
      resultRef.current = null;
      isValidRef.current = false;

      return confirm(
        {
          onValidChange: (v: boolean) => {
            isValidRef.current = v;
          },
          onResultReady: (r: VideoSelectResult) => {
            resultRef.current = r;
          },
          errorMessage: errorMessage ?? null,
        } satisfies VideoSelectDialogProps,
        () => isValidRef.current,
        dismissLabel ? { dismissButton: { children: dismissLabel } } : undefined
      ).then((confirmed) => (confirmed ? resultRef.current : null));
    },
    [confirm]
  );

  return { selectVideo, destroy };
}

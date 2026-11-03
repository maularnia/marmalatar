import { useConfirm } from '@providers/ConfirmationProvider/ConfirmationProvider';
import i18n from '@src/i18n';
import { useCallback, useRef } from 'react';
import { SelectAudioTrackDialog } from './SelectAudioTrackDialog';

const t = i18n.getFixedT(null, 'dialogs');

export function useSelectAudioTrackDialog() {
  const trackIdRef = useRef<number | null>(null);

  const { confirm, destroy } = useConfirm(SelectAudioTrackDialog, {
    confirmButton: { children: t('selectAudioTrack.selectButton') },
    dismissButton: { children: t('shared.cancel') },
  });

  // Resolves with the chosen track's id, or null on Cancel
  const selectAudioTrack = useCallback(
    async (videoPath: string): Promise<number | null> => {
      trackIdRef.current = null;
      const confirmed = await confirm(
        {
          videoPath,
          onTrackChange: (trackId: number | null) => {
            trackIdRef.current = trackId;
          },
        },
        () => trackIdRef.current !== null
      );
      return confirmed ? trackIdRef.current : null;
    },
    [confirm]
  );

  return { selectAudioTrack, destroy };
}

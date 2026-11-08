import type { TAudioTrack } from '@bridge/definitions/audioTrack';
import i18n from '@src/i18n';
import { modal } from '@src/services/modal';
import { SelectAudioTrackDialog } from './SelectAudioTrackDialog';

const t = i18n.getFixedT(null, 'dialogs');

/** Asks which of the tracks to use; resolves its id, or null when dismissed (`dismissLabel`). */
export async function selectAudioTrack(
  tracks: TAudioTrack[],
  initialTrackId: number,
  dismissLabel: string
): Promise<number | null> {
  let trackId = initialTrackId;
  const confirmed = await modal.confirm(
    SelectAudioTrackDialog,
    {
      tracks,
      initialTrackId,
      onTrackChange: (next: number) => {
        trackId = next;
      },
    },
    {
      confirmButton: { children: t('selectAudioTrack.selectButton') },
      dismissButton: { children: dismissLabel },
    }
  );
  return confirmed ? trackId : null;
}

import i18n from '@src/i18n';
import { modal } from '@src/services/modal';
import { SelectAudioTrackDialog } from './SelectAudioTrackDialog';

const t = i18n.getFixedT(null, 'dialogs');

/** Asks which of the video's audio tracks to use; resolves with its id, or null on Cancel. */
export async function selectAudioTrack(videoPath: string): Promise<number | null> {
  let trackId: number | null = null;
  const confirmed = await modal.confirm(
    SelectAudioTrackDialog,
    {
      videoPath,
      onTrackChange: (next: number | null) => {
        trackId = next;
      },
    },
    {
      confirmButton: { children: t('selectAudioTrack.selectButton') },
      dismissButton: { children: t('shared.cancel') },
      validate: () => trackId !== null,
    }
  );
  return confirmed ? trackId : null;
}

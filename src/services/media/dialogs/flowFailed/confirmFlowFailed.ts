import i18n from '@src/i18n';
import { modal } from '@src/services/modal';
import { FlowFailedDialog } from './FlowFailedDialog';

const t = i18n.getFixedT(null, 'dialogs');

/** The video has no readable audio tracks. Resolves true for "Select another video", false for
 * "Continue without video". */
export const confirmAudioDataFailed = () =>
  modal.confirm(
    FlowFailedDialog,
    { title: t('audioDataFailed.title'), message: t('audioDataFailed.message') },
    {
      confirmButton: { children: t('audioDataFailed.selectAnotherVideoButton') },
      dismissButton: { children: t('videoSelect.continueWithoutVideoButton') },
    }
  );

/** The track's audio or waveform couldn't be extracted. Resolves true to go back (`retryLabel`:
 * another track, or another video when there's only one), false to give up (`dismissLabel`). */
export const confirmWaveformFailed = (
  trackLabel: string,
  { retryLabel, dismissLabel }: { retryLabel: string; dismissLabel: string }
) =>
  modal.confirm(
    FlowFailedDialog,
    {
      title: t('waveformFailed.title'),
      message: t('waveformFailed.message', { track: trackLabel }),
    },
    {
      confirmButton: { children: retryLabel },
      dismissButton: { children: dismissLabel },
    }
  );

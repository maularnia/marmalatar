import { modal } from '@src/services/modal';
import i18n from '@src/i18n';
import { settings } from '@src/services/settings';
import { AutoMergeLinesDialog } from './AutoMergeLinesDialog';

const t = i18n.getFixedT(null, 'dialogs');

/** Resolves the threshold on confirm (read after the dialog closes, so edits made in it count),
 * `null` on dismiss. */
export const confirmAutoMerge = (): Promise<number | null> =>
  modal
    .confirm(
      AutoMergeLinesDialog,
      {},
      {
        confirmButton: { children: t('autoMergeLines.confirmButton') },
        dismissButton: { children: t('shared.cancel') },
      }
    )
    .then((confirmed) => (confirmed ? settings.get.autoMergeThreshold() : null));

import { createConfirm } from '@providers/bridges/confirmation';
import i18n from '@src/i18n';
import { settings } from '@src/services/settings';
import { AutoMergeLinesDialog } from './AutoMergeLinesDialog';

const t = i18n.getFixedT(null, 'dialogs');

const autoMergeWindow = createConfirm(AutoMergeLinesDialog, {
  confirmButton: { children: t('autoMergeLines.confirmButton') },
  dismissButton: { children: t('shared.cancel') },
});

/** Resolves the threshold on confirm (read after the dialog closes, so edits made in it count),
 * `null` on dismiss. */
export const confirmAutoMerge = (): Promise<number | null> =>
  autoMergeWindow
    .confirm({})
    .then((confirmed) => (confirmed ? settings.get.autoMergeThreshold() : null));

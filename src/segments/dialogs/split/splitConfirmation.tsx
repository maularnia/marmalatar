import { createConfirm } from '@providers/bridges/confirmation';
import i18n from '@src/i18n';
import { SplitDialog } from './SplitDialog';

const t = i18n.getFixedT(null, 'dialogs');

const splitWindow = createConfirm(SplitDialog, {
  confirmButton: { children: t('split.confirmButton') },
  dismissButton: { children: t('shared.cancel') },
});

export const confirmSplit = () => splitWindow.confirm({});

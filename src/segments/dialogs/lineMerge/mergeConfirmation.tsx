import { createConfirm } from '@providers/bridges/confirmation';
import i18n from '@src/i18n';
import { LimeMergeDialog, LineMergeDialogProps } from './LimeMergeDialog';

const t = i18n.getFixedT(null, 'dialogs');

const mergeWindow = createConfirm(LimeMergeDialog, {
  confirmButton: { children: t('lineMerge.confirmButton') },
  dismissButton: { children: t('shared.cancel') },
});

export const confirmMerge = (props: LineMergeDialogProps) => mergeWindow.confirm(props);

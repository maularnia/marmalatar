import { modal } from '@src/services/modal';
import i18n from '@src/i18n';
import { LimeMergeDialog, LineMergeDialogProps } from './LimeMergeDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const confirmMerge = (props: LineMergeDialogProps) =>
  modal.confirm(LimeMergeDialog, props, {
    confirmButton: { children: t('lineMerge.confirmButton') },
    dismissButton: { children: t('shared.cancel') },
  });

import { useConfirm } from '@providers/ConfirmationProvider/ConfirmationProvider';
import i18n from '@src/i18n';
import { LimeMergeDialog, LineMergeDialogProps } from './LimeMergeDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const useMergeConfirmation = () => {
  const { confirm, destroy } = useConfirm(LimeMergeDialog, {
    confirmButton: { children: t('lineMerge.confirmButton') },
    dismissButton: { children: t('shared.cancel') },
  });
  return {
    confirmMerge: (props: LineMergeDialogProps) => confirm(props),
    destroyMergeDialog: destroy,
  };
};

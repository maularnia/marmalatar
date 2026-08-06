import { useConfirm } from '@providers/ConfirmationProvider/ConfirmationProvider';
import i18n from '@src/i18n';
import { DeleteLineDialog, DeleteLineProps } from './DeleteLineDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const useDeleteLineConfirmation = () => {
  const { confirm, destroy } = useConfirm(DeleteLineDialog, {
    confirmButton: { children: t('shared.yes') },
    dismissButton: { children: t('shared.no') },
  });
  return {
    confirmDeleteLine: (props: DeleteLineProps) => confirm(props),
    destroyMergeDialog: destroy,
  };
};

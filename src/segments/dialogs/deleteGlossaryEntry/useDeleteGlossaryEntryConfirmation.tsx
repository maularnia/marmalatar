import { useConfirm } from '@providers/ConfirmationProvider/ConfirmationProvider';
import i18n from '@src/i18n';
import { DeleteGlossaryEntryDialog, DeleteGlossaryEntryProps } from './DeleteGlossaryEntryDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const useDeleteGlossaryEntryConfirmation = () => {
  const { confirm, destroy } = useConfirm(DeleteGlossaryEntryDialog, {
    confirmButton: { children: t('shared.yes') },
    dismissButton: { children: t('shared.no') },
  });
  return {
    confirmDeleteGlossaryEntry: (props: DeleteGlossaryEntryProps) => confirm(props),
    destroyDeleteGlossaryEntryDialog: destroy,
  };
};

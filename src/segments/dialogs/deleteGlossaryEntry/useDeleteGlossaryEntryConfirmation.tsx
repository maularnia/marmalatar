import { useConfirm } from '@providers/ConfirmationProvider/ConfirmationProvider';
import i18n from '@src/i18n';
import { glossaries } from '@store/slices/glossary';
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
    // Asks before deleting a pair of the open glossary; glossaries.deletePair itself doesn't, since
    // dialogs come from hooks
    confirmAndDeletePair: async (pairIndex: number): Promise<void> => {
      const pair = glossaries.get.data()?.list[pairIndex];
      if (!pair) return;
      const confirmed = await confirm({ original: pair.original, translation: pair.translation });
      if (confirmed) glossaries.deletePair(pairIndex);
    },
  };
};

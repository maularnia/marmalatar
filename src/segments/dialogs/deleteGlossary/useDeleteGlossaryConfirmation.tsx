import { useConfirm } from '@providers/ConfirmationProvider/ConfirmationProvider';
import i18n from '@src/i18n';
import { ThemeColors } from '@src/theme/utils';
import { overlays } from '@store/slices/overlays';
import { glossaries } from '@store/slices/aiPromptEditor';
import { DeleteGlossaryDialog } from './DeleteGlossaryDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const useDeleteGlossaryConfirmation = () => {
  const { confirm } = useConfirm(DeleteGlossaryDialog, {
    confirmButton: { children: t('shared.yes'), color: ThemeColors.RED },
    dismissButton: { children: t('shared.no') },
  });
  return {
    confirmDeleteGlossary: async (fileName: string, title: string): Promise<boolean> => {
      if (!(await confirm({ title }))) return false;
      overlays.closeAll();
      await glossaries.delete(fileName);
      return true;
    },
  };
};

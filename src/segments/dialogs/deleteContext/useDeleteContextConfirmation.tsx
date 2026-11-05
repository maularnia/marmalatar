import { useConfirm } from '@providers/ConfirmationProvider/ConfirmationProvider';
import i18n from '@src/i18n';
import { ThemeColors } from '@src/theme/utils';
import { overlays } from '@store/slices/overlays';
import { promptTemplates } from '@src/services/prompt';
import { DeleteContextDialog } from './DeleteContextDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const useDeleteContextConfirmation = () => {
  const { confirm } = useConfirm(DeleteContextDialog, {
    confirmButton: { children: t('shared.yes'), color: ThemeColors.RED },
    dismissButton: { children: t('shared.no') },
  });
  return {
    confirmDeleteContext: async (fileName: string, title: string): Promise<boolean> => {
      if (!(await confirm({ title }))) return false;
      overlays.closeAll();
      await promptTemplates.delete(fileName);
      return true;
    },
  };
};

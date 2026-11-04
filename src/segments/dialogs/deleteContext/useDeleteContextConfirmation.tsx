import { useConfirm } from '@providers/ConfirmationProvider/ConfirmationProvider';
import i18n from '@src/i18n';
import { ThemeColors } from '@src/theme/utils';
import { useAppDispatch } from '@store/hooks';
import { overlays } from '@store/slices/overlays';
import { promptTemplates } from '@store/slices/aiPromptEditor';
import { DeleteContextDialog } from './DeleteContextDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const useDeleteContextConfirmation = () => {
  const dispatch = useAppDispatch();
  const { confirm } = useConfirm(DeleteContextDialog, {
    confirmButton: { children: t('shared.yes'), color: ThemeColors.RED },
    dismissButton: { children: t('shared.no') },
  });
  return {
    confirmDeleteContext: async (fileName: string, title: string): Promise<boolean> => {
      if (!(await confirm({ title }))) return false;
      dispatch(overlays.closeAll());
      await dispatch(promptTemplates.delete(fileName));
      return true;
    },
  };
};

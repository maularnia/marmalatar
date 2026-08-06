import { useConfirm } from '@providers/ConfirmationProvider/ConfirmationProvider';
import i18n from '@src/i18n';
import { ThemeColors } from '@src/theme/utils';
import { useAppDispatch } from '@store/hooks';
import { closeOverlays } from '@store/slices/overlays';
import { deletePromptTemplate } from '@store/thunks';
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
      dispatch(closeOverlays());
      await dispatch(deletePromptTemplate(fileName));
      return true;
    },
  };
};

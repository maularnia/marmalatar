import { useConfirm } from '@providers/ConfirmationProvider/ConfirmationProvider';
import i18n from '@src/i18n';
import { ThemeColors } from '@src/theme/utils';
import { useAppDispatch } from '@store/hooks';
import { closeOverlays } from '@store/slices/overlays';
import { deleteGlossary } from '@store/thunks';
import { DeleteGlossaryDialog } from './DeleteGlossaryDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const useDeleteGlossaryConfirmation = () => {
  const dispatch = useAppDispatch();
  const { confirm } = useConfirm(DeleteGlossaryDialog, {
    confirmButton: { children: t('shared.yes'), color: ThemeColors.RED },
    dismissButton: { children: t('shared.no') },
  });
  return {
    confirmDeleteGlossary: async (fileName: string, title: string): Promise<boolean> => {
      if (!(await confirm({ title }))) return false;
      dispatch(closeOverlays());
      await dispatch(deleteGlossary(fileName));
      return true;
    },
  };
};

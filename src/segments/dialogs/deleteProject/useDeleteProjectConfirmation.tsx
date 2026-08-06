import { useConfirm } from '@providers/ConfirmationProvider/ConfirmationProvider';
import i18n from '@src/i18n';
import { ThemeColors } from '@src/theme/utils';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { deleteProjectFile } from '@store/slices/disc';
import { resetProject, selectProjectId } from '@store/slices/project';
import { useNavigate } from 'react-router-dom';
import { DeleteProjectDialog } from './DeleteProjectDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const useDeleteProjectConfirmation = () => {
  const dispatch = useAppDispatch();
  const currentProjectId = useAppSelector(selectProjectId);
  const navigate = useNavigate();
  const { confirm } = useConfirm(DeleteProjectDialog, {
    confirmButton: { children: t('shared.yes'), color: ThemeColors.RED },
    dismissButton: { children: t('shared.no') },
  });
  return {
    confirmDeleteProject: async (
      filePath: string,
      projectName: string,
      projectId: string
    ): Promise<boolean> => {
      if (!(await confirm({ projectName }))) return false;
      await dispatch(deleteProjectFile(filePath));
      if (projectId === currentProjectId) {
        dispatch(resetProject());
        navigate('/');
      }
      return true;
    },
  };
};

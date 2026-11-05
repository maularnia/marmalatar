import { useConfirm } from '@providers/ConfirmationProvider/ConfirmationProvider';
import i18n from '@src/i18n';
import { ThemeColors } from '@src/theme/utils';
import { useAppSelector } from '@store/hooks';
import { projects } from '@store/slices/project';
import { useNavigate } from 'react-router-dom';
import { DeleteProjectDialog } from './DeleteProjectDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const useDeleteProjectConfirmation = () => {
  const currentProjectId = useAppSelector(projects.selectId);
  const navigate = useNavigate();
  const { confirm } = useConfirm(DeleteProjectDialog, {
    confirmButton: { children: t('shared.yes'), color: ThemeColors.RED },
    dismissButton: { children: t('shared.no') },
  });
  return {
    confirmDeleteProject: async (projectName: string, projectId: string): Promise<boolean> => {
      if (!(await confirm({ projectName }))) return false;
      await projects.delete(projectId);
      if (projectId === currentProjectId) {
        projects.reset();
        navigate('/');
      }
      return true;
    },
  };
};

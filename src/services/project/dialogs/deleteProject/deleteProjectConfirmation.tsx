import { modal } from '@src/services/modal';
import i18n from '@src/i18n';
import { ThemeColors } from '@src/theme/utils';
import { DeleteProjectDialog } from './DeleteProjectDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const confirmDeleteProject = (projectName: string) =>
  modal.confirm(
    DeleteProjectDialog,
    { projectName },
    {
      confirmButton: { children: t('shared.yes'), color: ThemeColors.RED },
      dismissButton: { children: t('shared.no') },
    }
  );

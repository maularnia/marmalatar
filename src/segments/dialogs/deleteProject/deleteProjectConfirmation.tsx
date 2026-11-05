import { createConfirm } from '@providers/bridges/confirmation';
import i18n from '@src/i18n';
import { ThemeColors } from '@src/theme/utils';
import { DeleteProjectDialog } from './DeleteProjectDialog';

const t = i18n.getFixedT(null, 'dialogs');

const deleteProjectWindow = createConfirm(DeleteProjectDialog, {
  confirmButton: { children: t('shared.yes'), color: ThemeColors.RED },
  dismissButton: { children: t('shared.no') },
});

export const confirmDeleteProject = (projectName: string) =>
  deleteProjectWindow.confirm({ projectName });

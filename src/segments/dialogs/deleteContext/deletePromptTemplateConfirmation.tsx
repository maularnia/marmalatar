import { createConfirm } from '@providers/bridges/confirmation';
import i18n from '@src/i18n';
import { ThemeColors } from '@src/theme/utils';
import { DeleteContextDialog } from './DeleteContextDialog';

const t = i18n.getFixedT(null, 'dialogs');

const deletePromptTemplateWindow = createConfirm(DeleteContextDialog, {
  confirmButton: { children: t('shared.yes'), color: ThemeColors.RED },
  dismissButton: { children: t('shared.no') },
});

export const confirmDeletePromptTemplate = (title: string) =>
  deletePromptTemplateWindow.confirm({ title });

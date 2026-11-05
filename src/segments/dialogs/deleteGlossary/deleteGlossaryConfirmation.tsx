import { createConfirm } from '@providers/bridges/confirmation';
import i18n from '@src/i18n';
import { ThemeColors } from '@src/theme/utils';
import { DeleteGlossaryDialog } from './DeleteGlossaryDialog';

const t = i18n.getFixedT(null, 'dialogs');

const deleteGlossaryWindow = createConfirm(DeleteGlossaryDialog, {
  confirmButton: { children: t('shared.yes'), color: ThemeColors.RED },
  dismissButton: { children: t('shared.no') },
});

export const confirmDeleteGlossary = (title: string) => deleteGlossaryWindow.confirm({ title });

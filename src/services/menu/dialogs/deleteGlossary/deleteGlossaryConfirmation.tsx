import { modal } from '@src/services/modal';
import i18n from '@src/i18n';
import { ThemeColors } from '@src/theme/utils';
import { DeleteGlossaryDialog } from './DeleteGlossaryDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const confirmDeleteGlossary = (title: string) =>
  modal.confirm(
    DeleteGlossaryDialog,
    { title },
    {
      confirmButton: { children: t('shared.yes'), color: ThemeColors.RED },
      dismissButton: { children: t('shared.no') },
    }
  );

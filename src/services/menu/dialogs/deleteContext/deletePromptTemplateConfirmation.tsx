import { modal } from '@src/services/modal';
import i18n from '@src/i18n';
import { ThemeColors } from '@src/theme/utils';
import { DeleteContextDialog } from './DeleteContextDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const confirmDeletePromptTemplate = (title: string) =>
  modal.confirm(
    DeleteContextDialog,
    { title },
    {
      confirmButton: { children: t('shared.yes'), color: ThemeColors.RED },
      dismissButton: { children: t('shared.no') },
    }
  );

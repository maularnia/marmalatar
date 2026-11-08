import { modal } from '@src/services/modal';
import i18n from '@src/i18n';
import { DeleteLineDialog, DeleteLineProps } from './DeleteLineDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const confirmDeleteLine = (props: DeleteLineProps) =>
  modal.confirm(DeleteLineDialog, props, {
    confirmButton: { children: t('shared.yes') },
    dismissButton: { children: t('shared.no') },
  });

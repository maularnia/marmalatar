import { createConfirm } from '@providers/bridges/confirmation';
import i18n from '@src/i18n';
import { DeleteLineDialog, DeleteLineProps } from './DeleteLineDialog';

const t = i18n.getFixedT(null, 'dialogs');

const deleteLineWindow = createConfirm(DeleteLineDialog, {
  confirmButton: { children: t('shared.yes') },
  dismissButton: { children: t('shared.no') },
});

export const confirmDeleteLine = (props: DeleteLineProps) => deleteLineWindow.confirm(props);

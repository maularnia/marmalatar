import { createConfirm } from '@providers/bridges/confirmation';
import i18n from '@src/i18n';
import { DeleteGlossaryEntryDialog, DeleteGlossaryEntryProps } from './DeleteGlossaryEntryDialog';

const t = i18n.getFixedT(null, 'dialogs');

const deleteGlossaryEntryWindow = createConfirm(DeleteGlossaryEntryDialog, {
  confirmButton: { children: t('shared.yes') },
  dismissButton: { children: t('shared.no') },
});

export const confirmDeleteGlossaryEntry = (props: DeleteGlossaryEntryProps) =>
  deleteGlossaryEntryWindow.confirm(props);

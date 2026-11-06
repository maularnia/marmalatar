import { modal } from '@src/services/modal';
import i18n from '@src/i18n';
import { CleanupDialog, TCleanupFormValues } from './CleanupDialog';

const t = i18n.getFixedT(null, 'dialogs');

/** Resolves the form values on confirm, `null` on dismiss. */
export const confirmCleanup = (isEditMode: boolean): Promise<TCleanupFormValues | null> => {
  let values: TCleanupFormValues | null = null;
  return modal
    .confirm(
      CleanupDialog,
      { isEditMode, onValuesChange: (next) => (values = next) },
      {
        confirmButton: { children: t('cleanup.confirmButton') },
        dismissButton: { children: t('shared.cancel') },
      }
    )
    .then((confirmed) => (confirmed ? values : null));
};

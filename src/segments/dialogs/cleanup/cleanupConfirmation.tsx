import { createConfirm } from '@providers/bridges/confirmation';
import i18n from '@src/i18n';
import { CleanupDialog, TCleanupFormValues } from './CleanupDialog';

const t = i18n.getFixedT(null, 'dialogs');

const cleanupWindow = createConfirm(CleanupDialog, {
  confirmButton: { children: t('cleanup.confirmButton') },
  dismissButton: { children: t('shared.cancel') },
});

/** Resolves the form values on confirm, `null` on dismiss. */
export const confirmCleanup = (isEditMode: boolean): Promise<TCleanupFormValues | null> => {
  let values: TCleanupFormValues | null = null;
  return cleanupWindow
    .confirm({ isEditMode, onValuesChange: (next) => (values = next) })
    .then((confirmed) => (confirmed ? values : null));
};

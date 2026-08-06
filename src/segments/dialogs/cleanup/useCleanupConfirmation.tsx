import { useConfirm } from '@providers/ConfirmationProvider/ConfirmationProvider';
import i18n from '@src/i18n';
import { useCallback, useRef } from 'react';
import { CleanupDialog, TCleanupFormValues } from './CleanupDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const useCleanupConfirmation = () => {
  const valuesRef = useRef<TCleanupFormValues | null>(null);

  const { confirm, destroy } = useConfirm(CleanupDialog, {
    confirmButton: { children: t('cleanup.confirmButton') },
    dismissButton: { children: t('shared.cancel') },
  });

  const confirmCleanup = useCallback(
    (isEditMode: boolean): Promise<TCleanupFormValues | null> => {
      valuesRef.current = null;
      return confirm({
        isEditMode,
        onValuesChange: (values) => (valuesRef.current = values),
      }).then((confirmed) => (confirmed ? valuesRef.current : null));
    },
    [confirm]
  );

  return { confirmCleanup, destroyCleanupDialog: destroy };
};

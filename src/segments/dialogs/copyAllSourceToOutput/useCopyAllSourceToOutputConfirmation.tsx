import { useConfirm } from '@providers/ConfirmationProvider/ConfirmationProvider';
import i18n from '@src/i18n';
import { useCallback, useRef } from 'react';
import { CopyAllSourceToOutputDialog } from './CopyAllSourceToOutputDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const useCopyAllSourceToOutputConfirmation = () => {
  const overrideRef = useRef(true);

  const { confirm, destroy } = useConfirm(CopyAllSourceToOutputDialog, {
    confirmButton: { children: t('copyAllSourceToOutput.confirmButton') },
    dismissButton: { children: t('shared.cancel') },
  });

  const confirmCopyAllSourceToOutput = useCallback(
    (showOverrideToggle: boolean): Promise<boolean | null> => {
      overrideRef.current = true;
      return confirm({
        showOverrideToggle,
        onOverrideChange: (value) => (overrideRef.current = value),
      }).then((confirmed) => (confirmed ? overrideRef.current : null));
    },
    [confirm]
  );

  return { confirmCopyAllSourceToOutput, destroyCopyAllSourceToOutputDialog: destroy };
};

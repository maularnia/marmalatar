import { modal } from '@src/services/modal';
import i18n from '@src/i18n';
import { CopyAllSourceToOutputDialog } from './CopyAllSourceToOutputDialog';

const t = i18n.getFixedT(null, 'dialogs');

/** Resolves whether to override existing output on confirm, `null` on dismiss. */
export const confirmCopyAllSourceToOutput = (
  showOverrideToggle: boolean
): Promise<boolean | null> => {
  let override = true;
  return modal
    .confirm(
      CopyAllSourceToOutputDialog,
      { showOverrideToggle, onOverrideChange: (value) => (override = value) },
      {
        confirmButton: { children: t('copyAllSourceToOutput.confirmButton') },
        dismissButton: { children: t('shared.cancel') },
      }
    )
    .then((confirmed) => (confirmed ? override : null));
};

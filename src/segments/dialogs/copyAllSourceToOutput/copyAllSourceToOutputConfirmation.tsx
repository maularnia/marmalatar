import { createConfirm } from '@providers/bridges/confirmation';
import i18n from '@src/i18n';
import { CopyAllSourceToOutputDialog } from './CopyAllSourceToOutputDialog';

const t = i18n.getFixedT(null, 'dialogs');

const copyAllWindow = createConfirm(CopyAllSourceToOutputDialog, {
  confirmButton: { children: t('copyAllSourceToOutput.confirmButton') },
  dismissButton: { children: t('shared.cancel') },
});

/** Resolves whether to override existing output on confirm, `null` on dismiss. */
export const confirmCopyAllSourceToOutput = (
  showOverrideToggle: boolean
): Promise<boolean | null> => {
  let override = true;
  return copyAllWindow
    .confirm({ showOverrideToggle, onOverrideChange: (value) => (override = value) })
    .then((confirmed) => (confirmed ? override : null));
};

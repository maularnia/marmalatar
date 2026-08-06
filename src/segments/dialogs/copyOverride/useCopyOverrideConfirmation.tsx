import { useConfirm } from '@providers/ConfirmationProvider/ConfirmationProvider';
import i18n from '@src/i18n';
import { CopyOverrideDialog } from './CopyOverrideDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const useCopyOverrideConfirmation = () => {
  const { confirm, destroy } = useConfirm(CopyOverrideDialog, {
    confirmButton: { children: t('shared.yes') },
    dismissButton: { children: t('shared.no') },
  });
  return {
    confirmCopyOverride: () => confirm({}),
    destroyMergeDialog: destroy,
  };
};

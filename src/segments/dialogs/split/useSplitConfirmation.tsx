import { useConfirm } from '@providers/ConfirmationProvider/ConfirmationProvider';
import i18n from '@src/i18n';
import { SplitDialog } from './SplitDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const useSplitConfirmation = () => {
  const { confirm, destroy } = useConfirm(SplitDialog, {
    confirmButton: { children: t('split.confirmButton') },
    dismissButton: { children: t('shared.cancel') },
  });
  return {
    confirmSplit: () => confirm({}),
    destroySplitDialog: destroy,
  };
};

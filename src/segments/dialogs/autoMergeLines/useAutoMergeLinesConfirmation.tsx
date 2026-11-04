import { useConfirm } from '@providers/ConfirmationProvider/ConfirmationProvider';
import i18n from '@src/i18n';
import { settings } from '@src/store/slices/settings';
import { useAppSelector } from '@store/hooks';
import { AutoMergeLinesDialog } from './AutoMergeLinesDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const useAutoMergeLinesConfirmation = () => {
  const threshold = useAppSelector(settings.selectAutoMergeThreshold);

  const { confirm, destroy } = useConfirm(AutoMergeLinesDialog, {
    confirmButton: { children: t('autoMergeLines.confirmButton') },
    dismissButton: { children: t('shared.cancel') },
  });

  // Resolves the threshold on confirm, `null` on dismiss.
  const confirmAutoMerge = (): Promise<number | null> =>
    confirm({}).then((confirmed) => (confirmed ? threshold : null));

  return { confirmAutoMerge, destroyMergeDialog: destroy };
};

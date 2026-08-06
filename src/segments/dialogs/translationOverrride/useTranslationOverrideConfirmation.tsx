import { useConfirm } from '@providers/ConfirmationProvider/ConfirmationProvider';
import i18n from '@src/i18n';
import {
  TranslationOverrideDialog,
  TranslationOverrideDialogProps,
} from './TranslationOverrideDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const useTranslationOverrideConfirmation = () => {
  const { confirm, destroy } = useConfirm(TranslationOverrideDialog, {
    confirmButton: { children: t('translationOverride.confirmButton') },
    dismissButton: { children: t('shared.cancel') },
  });
  return {
    confirmTranslationOverride: (props: TranslationOverrideDialogProps) => confirm(props),
    destroyMergeDialog: destroy,
  };
};

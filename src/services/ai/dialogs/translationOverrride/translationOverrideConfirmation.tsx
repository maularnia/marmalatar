import { modal } from '@src/services/modal';
import i18n from '@src/i18n';
import {
  TranslationOverrideDialog,
  TranslationOverrideDialogProps,
} from './TranslationOverrideDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const confirmTranslationOverride = (props: TranslationOverrideDialogProps) =>
  modal.confirm(TranslationOverrideDialog, props, {
    confirmButton: { children: t('translationOverride.confirmButton') },
    dismissButton: { children: t('shared.cancel') },
  });

import { createConfirm } from '@providers/bridges/confirmation';
import i18n from '@src/i18n';
import {
  TranslationOverrideDialog,
  TranslationOverrideDialogProps,
} from './TranslationOverrideDialog';

const t = i18n.getFixedT(null, 'dialogs');

const translationOverrideWindow = createConfirm(TranslationOverrideDialog, {
  confirmButton: { children: t('translationOverride.confirmButton') },
  dismissButton: { children: t('shared.cancel') },
});

export const confirmTranslationOverride = (props: TranslationOverrideDialogProps) =>
  translationOverrideWindow.confirm(props);

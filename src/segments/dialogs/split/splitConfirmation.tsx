import { modal } from '@src/services/modal';
import i18n from '@src/i18n';
import { SplitDialog } from './SplitDialog';

const t = i18n.getFixedT(null, 'dialogs');

export const confirmSplit = () =>
  modal.confirm(
    SplitDialog,
    {},
    {
      confirmButton: { children: t('split.confirmButton') },
      dismissButton: { children: t('shared.cancel') },
    }
  );

import { createConfirm } from '@providers/bridges/confirmation';
import i18n from '@src/i18n';
import { CopyOverrideDialog } from './CopyOverrideDialog';

const t = i18n.getFixedT(null, 'dialogs');

const copyOverrideWindow = createConfirm(CopyOverrideDialog, {
  confirmButton: { children: t('shared.yes') },
  dismissButton: { children: t('shared.no') },
});

export const confirmCopyOverride = () => copyOverrideWindow.confirm({});

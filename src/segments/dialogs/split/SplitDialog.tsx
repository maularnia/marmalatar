import P, { TPVariant } from '@ui-toolkit/P';
import { useTranslation } from 'react-i18next';
import { DialogBodySmall, DialogContent, DialogTitle, DialogTitleContent } from '../partials';

export function SplitDialog() {
  const { t } = useTranslation('dialogs');
  return (
    <DialogBodySmall>
      <DialogTitle>
        <DialogTitleContent>{t('split.title')}</DialogTitleContent>
      </DialogTitle>
      <DialogContent>
        <P variant={TPVariant.TERTIARY}>{t('split.body')}</P>
      </DialogContent>
    </DialogBodySmall>
  );
}

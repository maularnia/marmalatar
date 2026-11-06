import type { TModalContentProps } from '@src/services/modal';
import { useTranslation } from 'react-i18next';
import { DialogBodySmall, DialogTitle, DialogTitleContent } from '../partials';

export function CopyOverrideDialog(_props: TModalContentProps) {
  const { t } = useTranslation('dialogs');
  return (
    <DialogBodySmall>
      <DialogTitle>
        <DialogTitleContent>{t('copyOverride.title')}</DialogTitleContent>
      </DialogTitle>
    </DialogBodySmall>
  );
}

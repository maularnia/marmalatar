import { TConfirmationWindowProps } from '@src/providers/ConfirmationProvider/types';
import { useTranslation } from 'react-i18next';
import { DialogBodySmall, DialogTitle, DialogTitleContent } from '../partials';

export function CopyOverrideDialog(_props: TConfirmationWindowProps) {
  const { t } = useTranslation('dialogs');
  return (
    <DialogBodySmall>
      <DialogTitle>
        <DialogTitleContent>{t('copyOverride.title')}</DialogTitleContent>
      </DialogTitle>
    </DialogBodySmall>
  );
}

import { TConfirmationWindowProps } from '@providers/ConfirmationProvider/types';
import { ThemeColors } from '@src/theme/utils';
import { TMessageSize, TMessageVariant } from '@ui-toolkit/Message';
import { useTranslation } from 'react-i18next';
import {
  DialogBodySmall,
  DialogContent,
  DialogNameSpan,
  DialogTitle,
  DialogTitleContent,
  DialogWarningMessage,
} from '../partials';

type DeleteContextProps = TConfirmationWindowProps & {
  title: string;
};

export function DeleteContextDialog({ title }: DeleteContextProps) {
  const { t } = useTranslation('dialogs');
  return (
    <DialogBodySmall>
      <DialogTitle>
        <DialogTitleContent>
          {t('deleteContext.titlePrefix')}{' '}
          <DialogNameSpan bold color={ThemeColors.ACCENT2}>
            {title}
          </DialogNameSpan>{' '}
          {t('deleteContext.titleSuffix')}
        </DialogTitleContent>
      </DialogTitle>
      <DialogContent>
        <DialogWarningMessage
          type={TMessageVariant.SECONDARY}
          size={TMessageSize.S}
          color={ThemeColors.RED}
        >
          {t('shared.actionCannotBeUndone')}
        </DialogWarningMessage>
      </DialogContent>
    </DialogBodySmall>
  );
}

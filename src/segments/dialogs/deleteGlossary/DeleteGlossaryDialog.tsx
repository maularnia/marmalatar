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

type DeleteGlossaryProps = TConfirmationWindowProps & {
  title: string;
};

export function DeleteGlossaryDialog({ title }: DeleteGlossaryProps) {
  const { t } = useTranslation('dialogs');
  return (
    <DialogBodySmall>
      <DialogTitle>
        <DialogTitleContent>
          {t('deleteGlossary.titlePrefix')}
          <DialogNameSpan bold color={ThemeColors.ACCENT2}>
            {title}
          </DialogNameSpan>{' '}
          {t('deleteGlossary.titleSuffix')}
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

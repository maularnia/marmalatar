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

type DeleteProjectProps = TConfirmationWindowProps & {
  projectName: string;
};

export function DeleteProjectDialog({ projectName }: DeleteProjectProps) {
  const { t } = useTranslation('dialogs');
  return (
    <DialogBodySmall>
      <DialogTitle>
        <DialogTitleContent>
          {t('deleteProject.titlePrefix')}{' '}
          <DialogNameSpan bold color={ThemeColors.ACCENT2}>
            {projectName}
          </DialogNameSpan>
          ?
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

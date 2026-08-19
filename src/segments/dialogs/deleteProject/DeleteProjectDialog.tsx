import { TConfirmationWindowProps } from '@providers/ConfirmationProvider/types';
import { ThemeColors } from '@src/theme/utils';
import H from '@ui-toolkit/H';
import { TMessageSize, TMessageVariant } from '@ui-toolkit/Message';
import Span from '@ui-toolkit/Span';
import { useTranslation } from 'react-i18next';
import {
  DialogBodyStandard,
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
    <DialogBodyStandard>
      <DialogTitle>
        <DialogTitleContent>{t('deleteProject.title')}</DialogTitleContent>
      </DialogTitle>
      <DialogContent>
        <H level={3} style={{ textAlign: 'center' }}>
          <DialogNameSpan color={ThemeColors.ACCENT2}>{projectName}</DialogNameSpan>
        </H>
        <DialogWarningMessage
          type={TMessageVariant.SECONDARY}
          size={TMessageSize.S}
          color={ThemeColors.RED}
        >
          <Span bold>{t('shared.actionCannotBeUndone')}</Span>
        </DialogWarningMessage>
      </DialogContent>
    </DialogBodyStandard>
  );
}

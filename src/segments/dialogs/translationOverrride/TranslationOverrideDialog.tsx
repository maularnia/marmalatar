import { TConfirmationWindowProps } from '@providers/ConfirmationProvider/types';
import P, { TPVariant } from '@ui-toolkit/P';
import { useTranslation } from 'react-i18next';
import { DialogBodyStandard, DialogContent, DialogTitle, DialogTitleContent } from '../partials';

export type TranslationOverrideDialogProps = {
  text: string;
} & TConfirmationWindowProps;

export function TranslationOverrideDialog({ text }: TranslationOverrideDialogProps) {
  const { t } = useTranslation('dialogs');
  return (
    <DialogBodyStandard>
      <DialogTitle>
        <DialogTitleContent>{t('translationOverride.title')}</DialogTitleContent>
      </DialogTitle>
      <DialogContent>
        <P variant={TPVariant.TERTIARY}>{text}</P>
      </DialogContent>
    </DialogBodyStandard>
  );
}

import { TConfirmationWindowProps } from '@providers/ConfirmationProvider/types';
import { TMessageSize, TMessageVariant } from '@ui-toolkit/Message';
import { Fragment } from 'react/jsx-runtime';
import { useTranslation } from 'react-i18next';
import {
  DialogBodySmall,
  DialogBodyStandard,
  DialogContent,
  DialogTitle,
  DialogTitleContent,
  DialogWarningMessage,
} from '../partials';

export type DeleteGlossaryEntryProps = TConfirmationWindowProps & {
  original: string;
  translation: string;
};

export function DeleteGlossaryEntryDialog({ original, translation }: DeleteGlossaryEntryProps) {
  const { t } = useTranslation('dialogs');
  const text = [original, translation].filter(Boolean).join(' — ');
  const Body =
    text.length > 50 ? DialogBodyStandard : text.length > 10 ? DialogBodySmall : Fragment;
  return (
    <Body>
      <DialogTitle>
        <DialogTitleContent>{t('deleteGlossaryEntry.title')}</DialogTitleContent>
      </DialogTitle>
      {text.length ? (
        <DialogContent>
          <DialogWarningMessage
            style={{ whiteSpace: 'pre-line' }}
            type={TMessageVariant.SECONDARY}
            size={TMessageSize.S}
          >
            {text}
          </DialogWarningMessage>
        </DialogContent>
      ) : null}
    </Body>
  );
}

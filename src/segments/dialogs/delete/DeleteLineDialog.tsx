import { TConfirmationWindowProps } from '@providers/ConfirmationProvider/types';
import { selectLines } from '@src/store/slices/editor';
import { useAppSelector } from '@store/hooks';
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

export type DeleteLineProps = TConfirmationWindowProps & {
  lineNo: number;
};

export function DeleteLineDialog({ lineNo }: DeleteLineProps) {
  const { t } = useTranslation('dialogs');
  const lines = useAppSelector(selectLines);
  const text = lines[lineNo - 1]?.output
    ? ` ${lines[lineNo - 1]?.output}`
    : lines[lineNo - 1]?.input
      ? lines[lineNo - 1]?.input
      : '';
  const Body =
    text.length > 50 ? DialogBodyStandard : text.length > 10 ? DialogBodySmall : Fragment;
  return (
    <Body>
      <DialogTitle>
        <DialogTitleContent>{t('deleteLine.title', { lineNo })}</DialogTitleContent>
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

import { type TModalContentProps } from '@src/services/modal';
import {
  DialogBodyStandard,
  DialogContent,
  DialogNameSpan,
  DialogTitle,
  DialogTitleContent,
} from '@src/services/modal';
import { TColor } from '@src/theme/definitions';
import H from '@ui-toolkit/H';
import P from '@ui-toolkit/P';
import { Trans, useTranslation } from 'react-i18next';

type TMergeCharactersDialogProps = TModalContentProps & {
  from: string;
  to: string;
  color: TColor;
};

// Renaming a character into another one's name: both become one
export function MergeCharactersDialog({ from, to, color }: TMergeCharactersDialogProps) {
  const { t } = useTranslation('dialogs');
  return (
    <DialogBodyStandard>
      <DialogTitle>
        <DialogTitleContent>{t('mergeCharacters.title')}</DialogTitleContent>
      </DialogTitle>
      <DialogContent>
        <H level={5} style={{ textAlign: 'center' }}>
          <DialogNameSpan color={color}>{from}</DialogNameSpan>
          {' → '}
          <DialogNameSpan color={color}>{to}</DialogNameSpan>
        </H>
        <P>
          <Trans
            t={t}
            i18nKey="mergeCharacters.message"
            values={{ from, to }}
            components={{ name: <b /> }}
          />
        </P>
      </DialogContent>
    </DialogBodyStandard>
  );
}

type TRemoveCharacterDialogProps = TModalContentProps & {
  name: string;
  color: TColor;
  lineCount: number;
};

// A character saved with an empty name: remove it from the pool and from its lines
export function RemoveCharacterDialog({ name, color, lineCount }: TRemoveCharacterDialogProps) {
  const { t } = useTranslation('dialogs');
  return (
    <DialogBodyStandard>
      <DialogTitle>
        <DialogTitleContent>{t('removeCharacter.title')}</DialogTitleContent>
      </DialogTitle>
      <DialogContent>
        <H level={5} style={{ textAlign: 'center' }}>
          <DialogNameSpan color={color}>{name}</DialogNameSpan>
        </H>
        <P>{t('removeCharacter.message', { count: lineCount })}</P>
      </DialogContent>
    </DialogBodyStandard>
  );
}

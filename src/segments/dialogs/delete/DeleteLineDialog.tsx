import { TConfirmationWindowProps } from '@providers/ConfirmationProvider/types';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import P from '@src/toolkit/P';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import { useTranslation } from 'react-i18next';
import { Fragment } from 'react/jsx-runtime';
import styled from 'styled-components';
import {
  DialogBodySmall,
  DialogBodyStandard,
  DialogContent,
  DialogTitle,
  DialogTitleContent,
} from '../partials';

// The text is passed in rather than read from the editor store: the editor service opens this
// dialog, so importing its facade here would be an import cycle.
export type DeleteLineProps = TConfirmationWindowProps & {
  lineNo: number;
  text: string;
};

const LineNumberTag = styled(Tag)`
  vertical-align: middle;
  margin-right: ${CSSVar('size6')};
`;

export function DeleteLineDialog({ lineNo, text }: DeleteLineProps) {
  const { t } = useTranslation('dialogs');
  const Body =
    text.length > 50 ? DialogBodyStandard : text.length > 10 ? DialogBodySmall : Fragment;
  return (
    <Body>
      <DialogTitle>
        <DialogTitleContent>{t('deleteLine.title')}</DialogTitleContent>
      </DialogTitle>
      {text.length ? (
        <DialogContent>
          <P style={{ whiteSpace: 'pre-line' }}>
            <LineNumberTag
              variant={TTagVariant.SECONDARY}
              size={TTagSize.SMALL}
              color={ThemeColors.ACCENT1}
            >
              {lineNo}
            </LineNumberTag>
            {text}
          </P>
        </DialogContent>
      ) : null}
    </Body>
  );
}

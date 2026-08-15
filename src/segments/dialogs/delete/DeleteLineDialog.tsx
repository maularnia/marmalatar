import { TConfirmationWindowProps } from '@providers/ConfirmationProvider/types';
import { selectLines } from '@src/store/slices/editor';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import P from '@src/toolkit/P';
import { useAppSelector } from '@store/hooks';
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

export type DeleteLineProps = TConfirmationWindowProps & {
  lineNo: number;
};

const LineNumberTag = styled(Tag)`
  vertical-align: middle;
  margin-right: ${CSSVar('size6')};
`;

export function DeleteLineDialog({ lineNo }: DeleteLineProps) {
  const { t } = useTranslation('dialogs');
  const lines = useAppSelector(selectLines);
  const text = lines[lineNo - 1]?.output || lines[lineNo - 1]?.input || '';
  const Body =
    text.length > 50 ? DialogBodyStandard : text.length > 10 ? DialogBodySmall : Fragment;
  return (
    <Body>
      <DialogTitle>
        <DialogTitleContent>{t('deleteLine.title', { lineNo })}</DialogTitleContent>
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

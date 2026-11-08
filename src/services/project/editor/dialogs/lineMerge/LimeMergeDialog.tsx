import type { TModalContentProps } from '@src/services/modal';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import P from '@ui-toolkit/P';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  DialogBodyStandard,
  DialogContent,
  DialogTitle,
  DialogTitleContent,
} from '@src/services/modal';

type TMergedLine = { lineNo: number; text: string };

// The lines are passed in rather than read from the editor store: the editor service opens this
// dialog, so importing its facade here would be an import cycle.
export type LineMergeDialogProps = {
  /** In display order (the earlier line first). */
  lines: [TMergedLine, TMergedLine];
} & TModalContentProps;

const LineNumberTag = styled(Tag)`
  vertical-align: middle;
  margin-right: ${CSSVar('size6')};
`;
export function LimeMergeDialog({ lines: [firstLine, secondLine] }: LineMergeDialogProps) {
  const { t } = useTranslation('dialogs');
  return (
    <DialogBodyStandard>
      <DialogTitle>
        <DialogTitleContent>{t('lineMerge.title')}</DialogTitleContent>
      </DialogTitle>
      <DialogContent>
        <P>{t('lineMerge.bodyQuestion')}</P>
        <P>
          <LineNumberTag
            variant={TTagVariant.SECONDARY}
            size={TTagSize.SMALL}
            color={ThemeColors.ACCENT1}
          >
            {firstLine.lineNo}
          </LineNumberTag>{' '}
          {firstLine.text}
        </P>
        <P>
          <LineNumberTag
            style={{ verticalAlign: 'middle' }}
            variant={TTagVariant.SECONDARY}
            size={TTagSize.SMALL}
            color={ThemeColors.ACCENT1}
          >
            {secondLine.lineNo}
          </LineNumberTag>{' '}
          {secondLine.text}
        </P>
      </DialogContent>
    </DialogBodyStandard>
  );
}

import { TConfirmationWindowProps } from '@src/providers/ConfirmationProvider/types';
import { selectLines } from '@src/store/slices/editor';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { useAppSelector } from '@store/hooks';
import P from '@ui-toolkit/P';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { DialogBodyStandard, DialogContent, DialogTitle, DialogTitleContent } from '../partials';

export type LineMergeDialogProps = {
  mergeMasterLineNo: number;
  targetLineNo: number;
} & TConfirmationWindowProps;

const LineNumberTag = styled(Tag)`
  vertical-align: middle;
  margin-right: ${CSSVar('size6')};
`;
export function LimeMergeDialog({ mergeMasterLineNo, targetLineNo }: LineMergeDialogProps) {
  const { t } = useTranslation('dialogs');
  const lines = useAppSelector(selectLines);
  const masterLine = lines[mergeMasterLineNo - 1];
  const targetLine = lines[targetLineNo - 1];
  const firstLine = mergeMasterLineNo < targetLineNo ? masterLine : targetLine;
  const secondLine = mergeMasterLineNo < targetLineNo ? targetLine : masterLine;
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
            {firstLine?.line_no}
          </LineNumberTag>{' '}
          {firstLine?.output || firstLine?.input}
        </P>
        <P>
          <LineNumberTag
            style={{ verticalAlign: 'middle' }}
            variant={TTagVariant.SECONDARY}
            size={TTagSize.SMALL}
            color={ThemeColors.ACCENT1}
          >
            {secondLine?.line_no}
          </LineNumberTag>{' '}
          {secondLine?.output || secondLine?.input}
        </P>
      </DialogContent>
    </DialogBodyStandard>
  );
}

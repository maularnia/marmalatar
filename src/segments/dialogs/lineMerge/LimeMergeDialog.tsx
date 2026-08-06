import { TConfirmationWindowProps } from '@src/providers/ConfirmationProvider/types';
import { selectLines } from '@src/store/slices/editor';
import { useAppSelector } from '@store/hooks';
import P from '@ui-toolkit/P';
import { useTranslation } from 'react-i18next';
import { DialogBodyStandard, DialogContent, DialogTitle, DialogTitleContent } from '../partials';

export type LineMergeDialogProps = {
  mergeMasterLineNo: number;
  targetLineNo: number;
} & TConfirmationWindowProps;

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
          [{firstLine?.line_no}]{firstLine?.output}
        </P>
        <P>
          [{secondLine?.line_no}]{secondLine?.output}
        </P>
      </DialogContent>
    </DialogBodyStandard>
  );
}

import { TConfirmationWindowProps } from '@providers/ConfirmationProvider/types';
import { useAppSelector } from '@src/store/hooks';
import { selectAutoMergeThreshold } from '@src/store/slices/app';
import { ThemeColors } from '@src/theme/utils';
import P from '@ui-toolkit/P';
import Span from '@ui-toolkit/Span';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import { useTranslation } from 'react-i18next';
import { DialogBodyStandard, DialogContent, DialogTitle, DialogTitleContent } from '../partials';

type AutoMergeLinesDialogProps = TConfirmationWindowProps;

export function AutoMergeLinesDialog(_props: AutoMergeLinesDialogProps) {
  const { t } = useTranslation('dialogs');
  const threshold = useAppSelector(selectAutoMergeThreshold);
  return (
    <DialogBodyStandard>
      <DialogTitle>
        <DialogTitleContent>{t('autoMergeLines.title')}</DialogTitleContent>
      </DialogTitle>
      <DialogContent>
        <P>
          {t('autoMergeLines.bodyPrefix')}{' '}
          <Tag variant={TTagVariant.SECONDARY} size={TTagSize.SMALL}>
            {threshold}ms
          </Tag>{' '}
          {t('autoMergeLines.bodyApart')}{' '}
          <Span bold color={ThemeColors.ACCENT2}>
            {t('autoMergeLines.bodyAssigned')}
          </Span>{' '}
          {t('autoMergeLines.bodySuffix')}
        </P>
      </DialogContent>
    </DialogBodyStandard>
  );
}

import type { TModalContentProps } from '@src/services/modal';
import P from '@ui-toolkit/P';
import { useTranslation } from 'react-i18next';
import {
  DialogBodySmall,
  DialogContent,
  DialogTitle,
  DialogTitleContent,
} from '@src/services/modal';

type TAutoFixTempoDialogProps = TModalContentProps & {
  /** The project's minimum interval between lines, in frames */
  minIntervalFrames: number;
  /** The same interval in milliseconds, rounded */
  minIntervalMs: number;
};

export function AutoFixTempoDialog({ minIntervalFrames, minIntervalMs }: TAutoFixTempoDialogProps) {
  const { t } = useTranslation('dialogs');
  const interval = t('autoFixTempo.interval', { frames: minIntervalFrames, ms: minIntervalMs });
  return (
    <DialogBodySmall>
      <DialogTitle>
        <DialogTitleContent>{t('autoFixTempo.title')}</DialogTitleContent>
      </DialogTitle>
      <DialogContent>
        <P>{t('autoFixTempo.overlapping', { interval })}</P>
        <P>{t('autoFixTempo.covering')}</P>
      </DialogContent>
    </DialogBodySmall>
  );
}

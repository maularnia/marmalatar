import type { TModalContentProps } from '@src/services/modal';
import P from '@ui-toolkit/P';
import Span from '@ui-toolkit/Span';
import { ThemeColors } from '@src/theme/utils';
import Toggle from '@ui-toolkit/Toggle';
import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  DialogBodySmall,
  DialogContent,
  DialogTitle,
  DialogTitleContent,
} from '@src/services/modal';
import Hr from '@src/toolkit/Hr/Hr';

// The project's own values (interval, CPS limit) stand out in the text: translations wrap them in
// <value></value>
const highlight = <Span color={ThemeColors.ACCENT1} />;

type TAutoFixTempoDialogProps = TModalContentProps & {
  /** The project's minimum interval between lines, in frames */
  minIntervalFrames: number;
  /** The same interval in milliseconds, rounded */
  minIntervalMs: number;
  maxCharsPerSecond: number;
  onExtendForCpsChange: (extendForCps: boolean) => void;
};

export function AutoFixTempoDialog({
  minIntervalFrames,
  minIntervalMs,
  maxCharsPerSecond,
  onExtendForCpsChange,
}: TAutoFixTempoDialogProps) {
  const { t } = useTranslation('dialogs');
  const interval = t('autoFixTempo.interval', { frames: minIntervalFrames, ms: minIntervalMs });
  // Off by default: lengthening lines changes how long they stay on screen, not just their gaps
  const [extendForCps, setExtendForCps] = useState(false);

  const onExtendForCpsChangeRef = useRef(onExtendForCpsChange);
  onExtendForCpsChangeRef.current = onExtendForCpsChange;
  useEffect(() => {
    onExtendForCpsChangeRef.current(extendForCps);
  }, [extendForCps]);

  return (
    <DialogBodySmall>
      <DialogTitle>
        <DialogTitleContent>{t('autoFixTempo.title')}</DialogTitleContent>
      </DialogTitle>
      <DialogContent>
        <P>
          <Trans
            t={t}
            i18nKey="autoFixTempo.overlapping"
            values={{ interval }}
            components={{ value: highlight }}
          />
        </P>
        <P>{t('autoFixTempo.covering')}</P>
        <Hr />
        <Toggle checked={extendForCps} onChange={(e) => setExtendForCps(e.currentTarget.checked)}>
          <Span>
            <Trans
              t={t}
              i18nKey="autoFixTempo.extendForCps"
              values={{ limit: maxCharsPerSecond }}
              components={{ value: highlight }}
            />
          </Span>
        </Toggle>
      </DialogContent>
    </DialogBodySmall>
  );
}

import type { TModalContentProps } from '@src/services/modal';
import {
  DialogBodyStandard,
  DialogContent,
  DialogTitle,
  DialogTitleContent,
} from '@src/services/modal';
import { ThemeColors } from '@src/theme/utils';
import Hr from '@src/toolkit/Hr/Hr';
import P from '@ui-toolkit/P';
import Span from '@ui-toolkit/Span';
import Toggle from '@ui-toolkit/Toggle';
import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import styled from 'styled-components';

// The project's own values (interval, CPS limit) stand out in the text: translations wrap them in
// <value></value>
const highlight = <Span color={ThemeColors.ACCENT1} />;

const AutoStandardDialogContent = styled(DialogContent)`
  width: 480px;
`;

type TAutoFixTempoDialogProps = TModalContentProps & {
  /** The project's minimum interval between lines, in frames */
  minIntervalFrames: number;
  /** The same interval in milliseconds, rounded */
  minIntervalMs: number;
  maxCharsPerSecond: number;
  onExtendForCpsChange: (extendForCps: boolean) => void;
  maxCharsPerLine: number;
  maxLinesPerEntry: number;
  onBreakLongLinesChange: (breakLongLines: boolean) => void;
};

export function AutoFixTempoDialog({
  minIntervalFrames,
  minIntervalMs,
  maxCharsPerSecond,
  onExtendForCpsChange,
  maxCharsPerLine,
  maxLinesPerEntry,
  onBreakLongLinesChange,
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

  // Off by default too: it's the one fix that changes the text itself
  const [breakLongLines, setBreakLongLines] = useState(false);
  const onBreakLongLinesChangeRef = useRef(onBreakLongLinesChange);
  onBreakLongLinesChangeRef.current = onBreakLongLinesChange;
  useEffect(() => {
    onBreakLongLinesChangeRef.current(breakLongLines);
  }, [breakLongLines]);

  return (
    <DialogBodyStandard>
      <DialogTitle>
        <DialogTitleContent>{t('autoFixTempo.title')}</DialogTitleContent>
      </DialogTitle>
      <AutoStandardDialogContent>
        <P>
          <Trans
            t={t}
            i18nKey="autoFixTempo.overlapping"
            values={{ interval }}
            // <br/> lets a translation break the sentence where it reads best
            components={{ value: highlight, br: <br /> }}
          />
        </P>
        <P>{t('autoFixTempo.partialOverlap')}</P>
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
        <Toggle
          checked={breakLongLines}
          onChange={(e) => setBreakLongLines(e.currentTarget.checked)}
        >
          <Span>
            <Trans
              t={t}
              i18nKey="autoFixTempo.breakLongLines"
              values={{ limit: maxCharsPerLine, total: maxCharsPerLine * maxLinesPerEntry }}
              components={{ value: highlight }}
            />
          </Span>
        </Toggle>
      </AutoStandardDialogContent>
    </DialogBodyStandard>
  );
}

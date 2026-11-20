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
import Select from '@ui-toolkit/Select/Select';
import type { TOptionSelect } from '@ui-toolkit/Select/types';
import Toggle from '@ui-toolkit/Toggle';
import Message, { TMessageSize, TMessageVariant } from '@ui-toolkit/Message';
import type { TAutoFixSkipped } from '@utils/tempo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import styled from 'styled-components';

// The project's own values (interval, CPS limit) stand out in the text: translations wrap them in
// <value></value>
const highlight = <Span color={ThemeColors.ACCENT1} />;

const AutoStandardDialogContent = styled(DialogContent)`
  width: 480px;
`;

// The text column the fix measures (empty lines, reading speed) and breaks lines in
export type TAutoFixTempoColumn = 'source' | 'output';

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
  /** Edit mode has only the source column to fix: the column choice is hidden */
  isEditMode: boolean;
  onTargetColumnChange: (targetColumn: TAutoFixTempoColumn) => void;
  /** A dry run of the fix with these choices: how many lines it would leave as they are, and why */
  previewSkipped: (options: TAutoFixTempoPreviewOptions) => TAutoFixSkipped;
};

export type TAutoFixTempoPreviewOptions = {
  targetColumn: TAutoFixTempoColumn;
  extendForCps: boolean;
  breakLongLines: boolean;
};

export function AutoFixTempoDialog({
  minIntervalFrames,
  minIntervalMs,
  maxCharsPerSecond,
  onExtendForCpsChange,
  maxCharsPerLine,
  maxLinesPerEntry,
  onBreakLongLinesChange,
  isEditMode,
  onTargetColumnChange,
  previewSkipped,
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

  // Translation mode fixes the output by default; the source can be picked instead
  const [targetColumn, setTargetColumn] = useState<TAutoFixTempoColumn>('output');
  const onTargetColumnChangeRef = useRef(onTargetColumnChange);
  onTargetColumnChangeRef.current = onTargetColumnChange;
  useEffect(() => {
    onTargetColumnChangeRef.current(isEditMode ? 'source' : targetColumn);
  }, [isEditMode, targetColumn]);
  const columnOptions: TOptionSelect[] = [
    { value: 'output', label: t('cleanup.columnOutput') },
    { value: 'source', label: t('cleanup.columnSource') },
  ];

  // Off by default too: it's the one fix that changes the text itself
  const [breakLongLines, setBreakLongLines] = useState(false);
  const onBreakLongLinesChangeRef = useRef(onBreakLongLinesChange);
  onBreakLongLinesChangeRef.current = onBreakLongLinesChange;
  useEffect(() => {
    onBreakLongLinesChangeRef.current(breakLongLines);
  }, [breakLongLines]);

  // What the fix would leave as it is with the current choices, one line per reason that applies
  const effectiveColumn = isEditMode ? 'source' : targetColumn;
  const previewSkippedRef = useRef(previewSkipped);
  previewSkippedRef.current = previewSkipped;
  const skipped = useMemo(
    () =>
      previewSkippedRef.current({ targetColumn: effectiveColumn, extendForCps, breakLongLines }),
    [effectiveColumn, extendForCps, breakLongLines]
  );
  const skippedReasons = [
    skipped.empty > 0 &&
      t('autoFixTempo.skippedEmpty', { count: skipped.empty, total: skipped.total }),
    skipped.covering > 0 &&
      t('autoFixTempo.skippedCovering', { count: skipped.covering, total: skipped.total }),
    skipped.unbreakable > 0 &&
      t('autoFixTempo.skippedUnbreakable', { count: skipped.unbreakable, total: skipped.total }),
  ].filter(Boolean);

  return (
    <DialogBodyStandard>
      <DialogTitle>
        <DialogTitleContent>{t('autoFixTempo.title')}</DialogTitleContent>
      </DialogTitle>
      <AutoStandardDialogContent>
        {!isEditMode && (
          <Select
            placeholder={t('autoFixTempo.column')}
            options={columnOptions}
            value={targetColumn}
            onChange={([value]) => setTargetColumn(value as TAutoFixTempoColumn)}
          />
        )}
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
        {skippedReasons.length > 0 && (
          <Message type={TMessageVariant.SECONDARY} size={TMessageSize.S} color={ThemeColors.RED}>
            {skippedReasons.join('\n')}
          </Message>
        )}
      </AutoStandardDialogContent>
    </DialogBodyStandard>
  );
}

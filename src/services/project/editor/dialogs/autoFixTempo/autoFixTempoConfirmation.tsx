import { modal } from '@src/services/modal';
import i18n from '@src/i18n';
import type { TProjectTempo } from '@bridge/definitions/projectEntry';
import { getMinGapMs } from '@utils/tempo';
import type { TAutoFixSkipped } from '@utils/tempo';
import {
  AutoFixTempoDialog,
  type TAutoFixTempoColumn,
  type TAutoFixTempoPreviewOptions,
} from './AutoFixTempoDialog';

const t = i18n.getFixedT(null, 'dialogs');

export type TAutoFixTempoOptions = {
  /** Also lengthen lines read faster than the CPS limit, where there's room */
  extendForCps: boolean;
  /** Also break entries whose lines are longer than the per-line limit */
  breakLongLines: boolean;
  /** The column fixed: chosen in translation mode (output by default), always source in edit mode */
  targetColumn: TAutoFixTempoColumn;
};

/** Resolves the chosen options on confirm, `null` on dismiss. */
export const confirmAutoFixTempo = (
  tempo: TProjectTempo,
  isEditMode: boolean,
  previewSkipped: (options: TAutoFixTempoPreviewOptions) => TAutoFixSkipped
): Promise<TAutoFixTempoOptions | null> => {
  let extendForCps = false;
  let breakLongLines = false;
  let targetColumn: TAutoFixTempoColumn = isEditMode ? 'source' : 'output';
  return modal
    .confirm(
      AutoFixTempoDialog,
      {
        minIntervalFrames: tempo.minIntervalFrames,
        minIntervalMs: Math.round(getMinGapMs(tempo)),
        maxCharsPerSecond: tempo.maxCharsPerSecond,
        onExtendForCpsChange: (value) => (extendForCps = value),
        maxCharsPerLine: tempo.maxCharsPerLine,
        maxLinesPerEntry: tempo.maxLinesPerEntry,
        onBreakLongLinesChange: (value) => (breakLongLines = value),
        isEditMode,
        onTargetColumnChange: (value) => (targetColumn = value),
        previewSkipped,
      },
      {
        confirmButton: { children: t('autoFixTempo.confirmButton') },
        dismissButton: { children: t('shared.cancel') },
      }
    )
    .then((confirmed) => (confirmed ? { extendForCps, breakLongLines, targetColumn } : null));
};

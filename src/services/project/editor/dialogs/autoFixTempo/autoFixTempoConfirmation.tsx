import { modal } from '@src/services/modal';
import i18n from '@src/i18n';
import type { TProjectTempo } from '@bridge/definitions/projectEntry';
import { getMinGapMs } from '@utils/tempo';
import { AutoFixTempoDialog } from './AutoFixTempoDialog';

const t = i18n.getFixedT(null, 'dialogs');

export type TAutoFixTempoOptions = {
  /** Also lengthen lines read faster than the CPS limit, where there's room */
  extendForCps: boolean;
};

/** Resolves the chosen options on confirm, `null` on dismiss. */
export const confirmAutoFixTempo = (tempo: TProjectTempo): Promise<TAutoFixTempoOptions | null> => {
  let extendForCps = false;
  return modal
    .confirm(
      AutoFixTempoDialog,
      {
        minIntervalFrames: tempo.minIntervalFrames,
        minIntervalMs: Math.round(getMinGapMs(tempo)),
        maxCharsPerSecond: tempo.maxCharsPerSecond,
        onExtendForCpsChange: (value) => (extendForCps = value),
      },
      {
        confirmButton: { children: t('autoFixTempo.confirmButton') },
        dismissButton: { children: t('shared.cancel') },
      }
    )
    .then((confirmed) => (confirmed ? { extendForCps } : null));
};

import { modal } from '@src/services/modal';
import i18n from '@src/i18n';
import type { TProjectTempo } from '@bridge/definitions/projectEntry';
import { getMinGapMs } from '@utils/tempo';
import { AutoFixTempoDialog } from './AutoFixTempoDialog';

const t = i18n.getFixedT(null, 'dialogs');

/** Resolves `true` on confirm, `false` on dismiss. */
export const confirmAutoFixTempo = (tempo: TProjectTempo): Promise<boolean> =>
  modal.confirm(
    AutoFixTempoDialog,
    {
      minIntervalFrames: tempo.minIntervalFrames,
      minIntervalMs: Math.round(getMinGapMs(tempo)),
    },
    {
      confirmButton: { children: t('autoFixTempo.confirmButton') },
      dismissButton: { children: t('shared.cancel') },
    }
  );

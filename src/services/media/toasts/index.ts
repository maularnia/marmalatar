import i18n from '@src/i18n';
import type { TToastParams } from '@src/services/toast';
import { TMessageType } from '@src/types';

// The media service's toasts: each builder returns a toast's params, translated when it's called,
// for the caller to show with toast.push(...).

const t = i18n.getFixedT(null, 'messages');
const tErrors = i18n.getFixedT(null, 'errors');

export function makeVideoPlaybackErrorMessage(): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('videoPlaybackError.title'),
    message: tErrors('videoPlaybackError.message'),
  };
}

export function makeAudioExtractionFailedMessage(message?: string): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('audioExtractionFailed.title'),
    message,
  };
}

export function makeWaveformExtractionFailedMessage(message?: string): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('waveformExtractionFailed.title'),
    message,
  };
}

export function makeCacheCleanupSuccessMessage(): TToastParams {
  return { type: TMessageType.MESSAGE, title: t('cacheCleanupSuccess.title') };
}

export function makeCacheCleanupFailedMessage(): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('cacheCleanupFailed.title'),
    message: tErrors('cacheCleanupFailed.message'),
  };
}

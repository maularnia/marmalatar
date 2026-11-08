import i18n from '@src/i18n';
import type { TToastParams } from '@src/services/toast';
import { TMessageType } from '@src/types';

// The menu service's toasts: each builder returns a toast's params, translated when it's called,
// for the caller to show with toast.push(...).

const tErrors = i18n.getFixedT(null, 'errors');

export function makeFileProcessingFailedMessage(message: string): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('fileProcessingFailed.title'),
    message,
  };
}

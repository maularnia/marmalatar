import i18n from '@src/i18n';
import type { TToastParams } from '@src/services/toast';
import { TMessageType } from '@src/types';

// The spellcheck service's toasts: each builder returns a toast's params, translated when it's called,
// for the caller to show with toast.push(...).

const tErrors = i18n.getFixedT(null, 'errors');

export function makeSpellcheckUnavailableMessage(message: string): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('spellcheckUnavailable.title'),
    message,
  };
}

import i18n from '@src/i18n';
import type { TToastParams } from '@src/services/toast';
import { TMessageType } from '@src/types';

// The ai service's toasts: each builder returns a toast's params, translated when it's called,
// for the caller to show with toast.push(...).

const t = i18n.getFixedT(null, 'messages');
const tErrors = i18n.getFixedT(null, 'errors');

export function makeNoPromptTemplateMessage(): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('noPromptTemplate.title'),
    message: tErrors('noPromptTemplate.message'),
  };
}

export function makeTranslationCancelledMessage(): TToastParams {
  return { type: TMessageType.MESSAGE, title: t('translationCancelled.title') };
}

export function makeUnableToTranslateLineMessage(): TToastParams {
  return { type: TMessageType.ERROR, title: tErrors('unableToTranslateLine.title') };
}

export function makeAiTranslationJobDoneMessage(): TToastParams {
  return {
    type: TMessageType.MESSAGE,
    title: t('aiTranslationJobDone.title'),
    message: t('aiTranslationJobDone.message'),
  };
}

export function makeAiTranslationJobFailedMessage(message: string): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('aiTranslationJobFailed.title'),
    message,
  };
}

export function makeBulkTranslationFailedMessage(message: string): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('bulkTranslationFailed.title'),
    message,
  };
}

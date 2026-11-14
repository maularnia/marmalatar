import i18n from '@src/i18n';
import type { TToastParams } from '@src/services/toast';
import { TMessageType } from '@src/types';

// The editor service's toasts: each builder returns a toast's params, translated when it's called,
// for the caller to show with toast.push(...).

const t = i18n.getFixedT(null, 'messages');
const tErrors = i18n.getFixedT(null, 'errors');

export function makeAutoMergeCancelledMessage(): TToastParams {
  return {
    type: TMessageType.MESSAGE,
    title: t('autoMergeCancelled.title'),
    message: t('autoMergeCancelled.message'),
  };
}

export function makeAutoMergeFailedMessage(message: string): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('autoMergeFailed.title'),
    message,
  };
}

export function makeCopyOperationCancelledMessage(): TToastParams {
  return {
    type: TMessageType.MESSAGE,
    title: t('copyOperationCancelled.title'),
    message: t('copyOperationCancelled.message'),
  };
}

export function makeCopyOperationFailedMessage(message: string): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('copyOperationFailed.title'),
    message,
  };
}

export function makeTextCopiedMessage(): TToastParams {
  return {
    type: TMessageType.MESSAGE,
    title: t('textCopied.title'),
    message: t('textCopied.message'),
  };
}

export function makeLineSplitMessage(): TToastParams {
  return {
    type: TMessageType.MESSAGE,
    title: t('lineSplit.title'),
    message: t('lineSplit.message'),
  };
}

export function makeMergeOperationCancelledMessage(): TToastParams {
  return {
    type: TMessageType.MESSAGE,
    title: t('mergeOperationCancelled.title'),
    message: t('mergeOperationCancelled.message'),
  };
}

export function makeMergeLinesFailedMessage(message: string): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('mergeLinesFailed.title'),
    message,
  };
}

export function makeLinesMergedMessage(): TToastParams {
  return {
    type: TMessageType.MESSAGE,
    title: t('linesMerged.title'),
  };
}

export function makeDeleteLineCancelledMessage(): TToastParams {
  return {
    type: TMessageType.MESSAGE,
    title: t('deleteLineCancelled.title'),
    message: t('deleteLineCancelled.message'),
  };
}

export function makeDeleteLineFailedMessage(message: string): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('deleteLineFailed.title'),
    message,
  };
}

export function makeLineDeletedMessage(): TToastParams {
  return {
    type: TMessageType.MESSAGE,
    title: t('lineDeleted.title'),
    message: t('lineDeleted.message'),
  };
}

export function makeLineTooShortToSplitMessage(): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('lineTooShortToSplit.title'),
    message: tErrors('lineTooShortToSplit.message'),
  };
}

export function makeEntryTimeShiftBlockedMessage(): TToastParams {
  return {
    type: TMessageType.WARNING,
    title: tErrors('entryTimeShiftBlocked.title'),
    message: tErrors('entryTimeShiftBlocked.message'),
  };
}

export function makeCleanupCancelledMessage(): TToastParams {
  return {
    type: TMessageType.MESSAGE,
    title: t('cleanupCancelled.title'),
    message: t('cleanupCancelled.message'),
  };
}

export function makeCleanupFailedMessage(message: string): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('cleanupFailed.title'),
    message,
  };
}

export function makeCopyAllCancelledMessage(): TToastParams {
  return {
    type: TMessageType.MESSAGE,
    title: t('copyAllCancelled.title'),
    message: t('copyAllCancelled.message'),
  };
}

export function makeCopyAllFailedMessage(message: string): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('copyAllFailed.title'),
    message,
  };
}

export function makeTempoAutoFixedMessage(count: number): TToastParams {
  return {
    type: TMessageType.MESSAGE,
    title: t('tempoAutoFixed.title'),
    message: t('tempoAutoFixed.message', { count }),
  };
}

export function makeTempoAutoFixNothingMessage(): TToastParams {
  return {
    type: TMessageType.MESSAGE,
    title: t('tempoAutoFixNothing.title'),
    message: t('tempoAutoFixNothing.message'),
  };
}

export function makeTempoAutoFixCancelledMessage(): TToastParams {
  return {
    type: TMessageType.MESSAGE,
    title: t('tempoAutoFixCancelled.title'),
    message: t('tempoAutoFixCancelled.message'),
  };
}

export function makeTempoAutoFixFailedMessage(message: string): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('tempoAutoFixFailed.title'),
    message,
  };
}

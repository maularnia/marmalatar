import i18n from '@src/i18n';
import type { TToastParams } from '@src/services/toast';
import { TMessageType } from '@src/types';

// The project service's toasts: each builder returns a toast's params, translated when it's called,
// for the caller to show with toast.push(...).

const t = i18n.getFixedT(null, 'messages');
const tErrors = i18n.getFixedT(null, 'errors');

export function makeVideoUpdatedMessage(): TToastParams {
  return {
    type: TMessageType.MESSAGE,
    title: t('videoUpdated.title'),
  };
}

export function makeVideoPathSaveFailedMessage(message: string): TToastParams {
  return {
    type: TMessageType.WARNING,
    title: t('videoPathSaveFailed.title'),
    message,
  };
}

export function makeVideoPathRemovalFailedMessage(message: string): TToastParams {
  return {
    type: TMessageType.WARNING,
    title: t('videoPathRemovalFailed.title'),
    message,
  };
}

export function makeProjectCreationAbortedMessage(message?: string): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('projectCreationAborted.title'),
    message,
  };
}

export function makeVideoFileMissingMessage(): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('videoFileMissing.title'),
  };
}

export function makeProjectStateReadFailedMessage(message?: string): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('projectStateReadFailed.title'),
    message,
  };
}

export function makeVideoFileCheckFailedMessage(message?: string): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('videoFileCheckFailed.title'),
    message,
  };
}

export function makeProjectLoadFailedMessage(message: string): TToastParams {
  return {
    type: TMessageType.ERROR,
    title: tErrors('projectLoadFailed.title'),
    message,
  };
}

export function makeProjectLoadedMessage(): TToastParams {
  return {
    type: TMessageType.MESSAGE,
    title: t('projectLoaded.title'),
    message: t('projectLoaded.message'),
  };
}

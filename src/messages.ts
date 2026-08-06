import i18n from '@src/i18n';
import type { PushMessageParams } from '@src/providers/MessageHelmetProvider';
import { TMessageType } from '@src/types';
import type { ReactNode } from 'react';

type PushMessage = (params: PushMessageParams) => void;

const t = i18n.getFixedT(null, 'messages');
const tErrors = i18n.getFixedT(null, 'errors');

// VideoProvider

export function emitVideoPlaybackErrorMessage(pushMessage: PushMessage): void {
  pushMessage({
    type: TMessageType.ERROR,
    title: tErrors('videoPlaybackError.title'),
    message: tErrors('videoPlaybackError.message'),
  });
}

// useAddToGlossaryDialog

export function emitGlossaryPairAddedMessage(
  pushMessage: PushMessage,
  original: string,
  translation: string,
  glossaryFileName: string
): void {
  pushMessage({
    type: TMessageType.MESSAGE,
    title: t('glossaryPairAdded.title'),
    message: t('glossaryPairAdded.message', { original, translation, glossaryFileName }),
  });
}

export function emitGlossaryPairDiscardedMessage(pushMessage: PushMessage): void {
  pushMessage({
    type: TMessageType.MESSAGE,
    title: t('glossaryPairDiscarded.title'),
    message: t('glossaryPairDiscarded.message'),
  });
}

// MainMenuListItem

export function emitFileProcessingFailedMessage(pushMessage: PushMessage, message: string): void {
  pushMessage({
    type: TMessageType.ERROR,
    title: tErrors('fileProcessingFailed.title'),
    message,
  });
}

// useVideoFileSwap

export function emitVideoUpdatedMessage(pushMessage: PushMessage): void {
  pushMessage({
    type: TMessageType.MESSAGE,
    title: t('videoUpdated.title'),
  });
}

// EditorControls

export function emitAutoMergeCancelledMessage(pushMessage: PushMessage): void {
  pushMessage({
    type: TMessageType.MESSAGE,
    title: t('autoMergeCancelled.title'),
    message: t('autoMergeCancelled.message'),
  });
}

export function emitAutoMergeFailedMessage(pushMessage: PushMessage, message: string): void {
  pushMessage({
    type: TMessageType.ERROR,
    title: tErrors('autoMergeFailed.title'),
    message,
  });
}

// TinyDivEditor

export function emitSpellcheckUnavailableMessage(pushMessage: PushMessage, message: string): void {
  pushMessage({
    type: TMessageType.ERROR,
    title: tErrors('spellcheckUnavailable.title'),
    message,
  });
}

// usePersistVideoPath

export function emitVideoPathSaveFailedMessage(pushMessage: PushMessage, message: string): void {
  pushMessage({
    type: TMessageType.WARNING,
    title: t('videoPathSaveFailed.title'),
    message,
  });
}

export function emitVideoPathRemovalFailedMessage(pushMessage: PushMessage, message: string): void {
  pushMessage({
    type: TMessageType.WARNING,
    title: t('videoPathRemovalFailed.title'),
    message,
  });
}

// useProjectLoader

export function emitVideoFileMissingMessage(pushMessage: PushMessage): void {
  pushMessage({
    type: TMessageType.ERROR,
    title: tErrors('videoFileMissing.title'),
  });
}

export function emitVideoProcessingFailedMessage(pushMessage: PushMessage): void {
  pushMessage({
    type: TMessageType.ERROR,
    title: tErrors('videoProcessingFailed.title'),
    message: tErrors('videoProcessingFailed.message'),
  });
}

export function emitProjectLoadFailedMessage(pushMessage: PushMessage, message: string): void {
  pushMessage({
    type: TMessageType.ERROR,
    title: tErrors('projectLoadFailed.title'),
    message,
  });
}

export function emitProjectLoadedMessage(pushMessage: PushMessage): void {
  pushMessage({
    type: TMessageType.MESSAGE,
    title: t('projectLoaded.title'),
    message: t('projectLoaded.message'),
  });
}

// EditorAIActionsProvider

export function emitNoPromptTemplateMessage(pushMessage: PushMessage): void {
  pushMessage({
    type: TMessageType.ERROR,
    title: tErrors('noPromptTemplate.title'),
    message: tErrors('noPromptTemplate.message'),
  });
}

export function emitTranslationCancelledMessage(pushMessage: PushMessage): void {
  pushMessage({ type: TMessageType.MESSAGE, title: t('translationCancelled.title') });
}

export function emitUnableToTranslateLineMessage(pushMessage: PushMessage): void {
  pushMessage({ type: TMessageType.ERROR, title: tErrors('unableToTranslateLine.title') });
}

export function emitAiTranslationJobDoneMessage(pushMessage: PushMessage): void {
  pushMessage({
    type: TMessageType.MESSAGE,
    title: t('aiTranslationJobDone.title'),
    message: t('aiTranslationJobDone.message'),
  });
}

export function emitAiTranslationJobFailedMessage(pushMessage: PushMessage, message: string): void {
  pushMessage({
    type: TMessageType.ERROR,
    title: tErrors('aiTranslationJobFailed.title'),
    message,
  });
}

export function emitBulkTranslationFailedMessage(pushMessage: PushMessage, message: string): void {
  pushMessage({
    type: TMessageType.ERROR,
    title: tErrors('bulkTranslationFailed.title'),
    message,
  });
}

export function emitNoMatchingGlossariesMessage(pushMessage: PushMessage): void {
  pushMessage({
    type: TMessageType.ERROR,
    title: tErrors('noMatchingGlossaries.title'),
    message: tErrors('noMatchingGlossaries.message'),
  });
}

export function emitGlossaryEntryAddedMessage(pushMessage: PushMessage, message: ReactNode): void {
  pushMessage({
    type: TMessageType.MESSAGE,
    title: t('glossaryEntryAdded.title'),
    message,
  });
}

export function emitGlossaryEntrySaveFailedMessage(pushMessage: PushMessage): void {
  pushMessage({
    type: TMessageType.ERROR,
    title: tErrors('glossaryEntrySaveFailed.title'),
    message: tErrors('glossaryEntrySaveFailed.message'),
  });
}

export function emitAddGlossaryEntryErrorMessage(pushMessage: PushMessage, message: string): void {
  pushMessage({
    type: TMessageType.ERROR,
    title: tErrors('addGlossaryEntryError.title'),
    message,
  });
}

// EditorActionsProvider

export function emitCopyOperationCancelledMessage(pushMessage: PushMessage): void {
  pushMessage({
    type: TMessageType.MESSAGE,
    title: t('copyOperationCancelled.title'),
    message: t('copyOperationCancelled.message'),
  });
}

export function emitCopyOperationFailedMessage(pushMessage: PushMessage, message: string): void {
  pushMessage({
    type: TMessageType.ERROR,
    title: tErrors('copyOperationFailed.title'),
    message,
  });
}

export function emitTextCopiedMessage(pushMessage: PushMessage): void {
  pushMessage({
    type: TMessageType.MESSAGE,
    title: t('textCopied.title'),
    message: t('textCopied.message'),
  });
}

export function emitLineSplitMessage(pushMessage: PushMessage): void {
  pushMessage({
    type: TMessageType.MESSAGE,
    title: t('lineSplit.title'),
    message: t('lineSplit.message'),
  });
}

export function emitMergeOperationCancelledMessage(pushMessage: PushMessage): void {
  pushMessage({
    type: TMessageType.MESSAGE,
    title: t('mergeOperationCancelled.title'),
    message: t('mergeOperationCancelled.message'),
  });
}

export function emitMergeLinesFailedMessage(pushMessage: PushMessage, message: string): void {
  pushMessage({
    type: TMessageType.ERROR,
    title: tErrors('mergeLinesFailed.title'),
    message,
  });
}

export function emitLinesMergedMessage(pushMessage: PushMessage): void {
  pushMessage({
    type: TMessageType.MESSAGE,
    title: t('linesMerged.title'),
  });
}

export function emitDeleteLineCancelledMessage(pushMessage: PushMessage): void {
  pushMessage({
    type: TMessageType.MESSAGE,
    title: t('deleteLineCancelled.title'),
    message: t('deleteLineCancelled.message'),
  });
}

export function emitDeleteLineFailedMessage(pushMessage: PushMessage, message: string): void {
  pushMessage({
    type: TMessageType.ERROR,
    title: tErrors('deleteLineFailed.title'),
    message,
  });
}

export function emitLineDeletedMessage(pushMessage: PushMessage): void {
  pushMessage({
    type: TMessageType.MESSAGE,
    title: t('lineDeleted.title'),
    message: t('lineDeleted.message'),
  });
}

export function emitLineTooShortToSplitMessage(pushMessage: PushMessage): void {
  pushMessage({
    type: TMessageType.ERROR,
    title: tErrors('lineTooShortToSplit.title'),
    message: tErrors('lineTooShortToSplit.message'),
  });
}

export function emitCleanupCancelledMessage(pushMessage: PushMessage): void {
  pushMessage({
    type: TMessageType.MESSAGE,
    title: t('cleanupCancelled.title'),
    message: t('cleanupCancelled.message'),
  });
}

export function emitCleanupFailedMessage(pushMessage: PushMessage, message: string): void {
  pushMessage({
    type: TMessageType.ERROR,
    title: tErrors('cleanupFailed.title'),
    message,
  });
}

export function emitCopyAllCancelledMessage(pushMessage: PushMessage): void {
  pushMessage({
    type: TMessageType.MESSAGE,
    title: t('copyAllCancelled.title'),
    message: t('copyAllCancelled.message'),
  });
}

export function emitCopyAllFailedMessage(pushMessage: PushMessage, message: string): void {
  pushMessage({
    type: TMessageType.ERROR,
    title: tErrors('copyAllFailed.title'),
    message,
  });
}

import type {
  TranslationBatchController,
  TranslationBatchResult,
  TranslationProgressSnapshot,
} from './connector/types';

// The running bulk job's controller. It carries functions, so it can't live in the store; it sits
// in its own module because both the slice (cancelling the job when the folder or prompt template
// changes) and the operations (starting and cancelling it) use it, and the slice can't import
// actions.ts without a cycle.
type TActiveController = TranslationBatchController<
  TranslationProgressSnapshot,
  TranslationBatchResult
>;

let activeController: TActiveController | null = null;

export function setActiveBulkJobController(controller: TActiveController | null): void {
  activeController = controller;
}

export function cancelActiveBulkJob(): void {
  activeController?.cancel();
  activeController = null;
}

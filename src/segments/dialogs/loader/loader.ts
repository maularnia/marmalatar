import { modal, type TModalInfoOptions } from '@src/services/modal';
import { LoaderDialog } from './LoaderDialog';

const DEFAULT_MESSAGE_LIFETIME = 5000;

export type TLoadProps = {
  messages: string[];
};

export type TLoadOptions = TModalInfoOptions & {
  /** Time, in ms, each message stays fully visible before the next one replaces it. Appearing and
   * disappearing aren't part of it. Ignored unless there are at least two messages. */
  messageLifetime?: number;
};
/** Shows the loader while `promise` runs, and resolves or rejects with it. */
export function load<R>(
  { messages }: TLoadProps,
  promise: Promise<R>,
  { messageLifetime = DEFAULT_MESSAGE_LIFETIME, ...showOptions }: TLoadOptions = {}
): Promise<R> {
  return modal.showInfo(LoaderDialog, { messages, messageLifetime }, promise, showOptions);
}

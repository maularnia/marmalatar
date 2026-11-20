import { showInfoModal } from '../actions';
import type { TModalInfoOptions } from '../types';
import { LoaderDialog } from './LoaderDialog';

const DEFAULT_MESSAGE_LIFETIME = 5000;

type TLoadProps = {
  messages: string[];
};

export type TLoadOptions = TModalInfoOptions & {
  /** Time, in ms, each message stays fully visible before the next one replaces it. Appearing and
   * disappearing aren't part of it. Ignored unless there are at least two messages. */
  messageLifetime?: number;
};
/** Shows the loader -- its messages cycling -- while `promise` runs, and resolves or rejects with
 * it. */
export function loadModal<R>(
  { messages }: TLoadProps,
  promise: Promise<R>,
  { messageLifetime = DEFAULT_MESSAGE_LIFETIME, ...showOptions }: TLoadOptions = {}
): Promise<R> {
  return showInfoModal(LoaderDialog, { messages, messageLifetime }, promise, showOptions);
}

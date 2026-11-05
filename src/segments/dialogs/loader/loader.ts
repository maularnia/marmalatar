import { createInfoWindow } from '@providers/bridges/confirmation';
import { LoaderDialog } from './LoaderDialog';
import type { TConfirmationHookProps } from '@providers/ConfirmationProvider/types';

export const DEFAULT_MESSAGE_LIFETIME = 5000;

export type TLoadProps = {
  messages: string[];
};

export type TLoadOptions = Pick<TConfirmationHookProps, 'animate' | 'delay' | 'minLifeTime'> & {
  /** Time, in ms, each message stays fully visible before the next one replaces it. Appearing and
   * disappearing aren't part of it. Ignored unless there are at least two messages. */
  messageLifetime?: number;
};
const loaderWindow = createInfoWindow(LoaderDialog);

/** `useLoader().load` for code outside React (services): shows the loader while `promise` runs. */
export function load<R>(
  { messages }: TLoadProps,
  promise: Promise<R>,
  { messageLifetime = DEFAULT_MESSAGE_LIFETIME, ...showOptions }: TLoadOptions = {}
): Promise<R> {
  return loaderWindow.show({ messages, messageLifetime }, promise, showOptions);
}

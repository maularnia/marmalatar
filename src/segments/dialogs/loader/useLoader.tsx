import { useInfoWindow } from '@providers/ConfirmationProvider/ConfirmationProvider';
import { TConfirmationHookProps } from '@providers/ConfirmationProvider/types';
import { useCallback } from 'react';
import { LoaderDialog } from './LoaderDialog';

const DEFAULT_MESSAGE_LIFETIME = 5000;

type TLoadProps = {
  messages: string[];
};

type TLoadOptions = Pick<TConfirmationHookProps, 'animate' | 'delay' | 'minLifeTime'> & {
  /** Time, in ms, each message stays fully visible before the next one replaces it. Appearing and
   * disappearing aren't part of it. Ignored unless there are at least two messages. */
  messageLifetime?: number;
};

export const useLoader = () => {
  const { show } = useInfoWindow(LoaderDialog);

  const load = useCallback(
    <R,>(
      { messages }: TLoadProps,
      promise: Promise<R>,
      { messageLifetime = DEFAULT_MESSAGE_LIFETIME, ...showOptions }: TLoadOptions = {}
    ): Promise<R> => show({ messages, messageLifetime }, promise, showOptions),
    [show]
  );

  return { load };
};

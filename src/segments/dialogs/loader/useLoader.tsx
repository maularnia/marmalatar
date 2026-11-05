import { useInfoWindow } from '@providers/ConfirmationProvider/ConfirmationProvider';
import { useCallback } from 'react';
import { DEFAULT_MESSAGE_LIFETIME, TLoadOptions, TLoadProps } from './loader';
import { LoaderDialog } from './LoaderDialog';

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

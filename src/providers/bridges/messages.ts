import type { TMessageType } from '@src/types';
import type { ReactNode } from 'react';
import { bridgeNotMounted } from './bridgeNotMounted';

export type TPushMessageParams = {
  type: TMessageType;
  title: string;
  message?: ReactNode;
};

let push: ((params: TPushMessageParams) => void) | null = null;

/** Called by `MessageHelmetProvider` on mount; the returned function unregisters it. */
export function registerMessagesBridge(value: (params: TPushMessageParams) => void): () => void {
  push = value;
  return () => {
    if (push === value) push = null;
  };
}

/** `useMessageHelmet().pushMessage` for code outside React; pass it to `emit*Message`. */
export function pushMessage(params: TPushMessageParams): void {
  (push ?? bridgeNotMounted('messages'))(params);
}

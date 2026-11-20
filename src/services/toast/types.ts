import type { TMessageType } from '@src/types';
import type { ReactNode } from 'react';

export type TToastId = number;

export type TToastParams = {
  type: TMessageType;
  title: string;
  message?: ReactNode;
};

import { MessageTypeToTimeout } from '@src/consts';
import { Service } from '@src/services/Service';
import { toastMessages } from './registry';
import { toastDismissed, toastPushed } from './slice';
import type { TToastId, TToastParams } from './types';

// The toast service's operations. Toasts are pushed through the facade (toast.push), usually with
// a make*Message builder from src/messages.ts; the Toasts host renders them.

let nextId: TToastId = 1;

export function dismissToast(id: TToastId): void {
  toastMessages.delete(id);
  Service.dispatch(toastDismissed(id));
}

/** Shows a toast; it closes itself after its type's timeout (errors stay until dismissed). */
export function pushToast({ type, title, message }: TToastParams): TToastId {
  const id = nextId++;
  if (message !== undefined) toastMessages.set(id, message);
  Service.dispatch(toastPushed({ id, type, title }));
  const timeout = MessageTypeToTimeout[type];
  if (Number.isFinite(timeout)) window.setTimeout(() => dismissToast(id), timeout);
  return id;
}

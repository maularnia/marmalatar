import { MessageTypeToTimeout } from '@src/consts';
import { Service } from '@src/services/Service';
import { toastMessages } from './registry';
import { selectToastList, toastDismissed, toastPushed } from './slice';
import type { TToastId, TToastParams } from './types';

// The toast service's operations. Toasts are pushed through the facade (toast.push), usually with
// a make*Message builder from src/messages.ts; the Toasts host renders them.

let nextId: TToastId = 1;

// How many toasts are on screen at once: a new one closes the oldest beyond this
const MAX_TOASTS = 2;

export function dismissToast(id: TToastId): void {
  toastMessages.delete(id);
  Service.dispatch(toastDismissed(id));
}

/** Shows a toast; it closes itself after its type's timeout (errors stay until dismissed). Only the
 * last MAX_TOASTS stay on screen: older ones, errors included, are dismissed as new ones come. */
export function pushToast({ type, title, message }: TToastParams): TToastId {
  const id = nextId++;
  if (message !== undefined) toastMessages.set(id, message);
  Service.dispatch(toastPushed({ id, type, title }));
  const toasts = Service.select(selectToastList);
  toasts.slice(0, Math.max(0, toasts.length - MAX_TOASTS)).forEach((old) => dismissToast(old.id));
  const timeout = MessageTypeToTimeout[type];
  if (Number.isFinite(timeout)) window.setTimeout(() => dismissToast(id), timeout);
  return id;
}

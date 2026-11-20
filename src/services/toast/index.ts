import { Service } from '@src/services/Service';
import { dismissToast, pushToast } from './actions';
import { selectToastList } from './slice';

// The toast service: short notifications at the bottom of the window. Anything pushes one with
// toast.push({ type, title, message }) -- usually with a make*Message builder from
// src/messages.ts. The service tracks them in its slice (serializable state) and registry.ts (the
// messages), and renders them with the Toasts host, mounted once in main.tsx. This file is its
// only entry point.

export { default as toastReducer } from './slice';
export { Toasts } from './Toasts';
export type { TToastParams } from './types';

export const toast = new Service('toast', {
  selectors: {
    selectToastList,
  },
  functions: {
    dismissToast,
    pushToast,
  },
});

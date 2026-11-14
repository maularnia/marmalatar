import { Service } from '@src/services/Service';
import { confirmModal, showInfoModal } from './actions';
import { loadModal } from './loader/loadModal';
import { selectIsModalOpen, selectModalWindows } from './slice';

// The modal service: dialog windows. Services and dialog modules open them through the facade --
// modal.confirm(Content, props, options) resolves true/false, modal.showInfo(Content, props,
// promise, options) shows a window while the promise runs. The service tracks the open windows in
// its slice (serializable state) and registry.ts (content, buttons, callbacks), and renders them
// with the Modals host, mounted once in main.tsx. This file is its only entry point.

export { default as modalReducer } from './slice';
export { Modals } from './Modals';
export type { TModalContentProps } from './types';
export type { TLoadOptions } from './loader/loadModal';
export * from './partials';

export const modal = new Service('modal', {
  selectors: {
    selectIsModalOpen,
    selectModalWindows,
  },
  functions: {
    confirmModal,
    loadModal,
    showInfoModal,
  },
});

import {
  EventBus,
  ShortcutScope,
  ShortcutSettings,
  ShortcutStatus,
  ShortcutType,
} from 'react-keyhub';
import { PropsWithChildren, RefObject, useEffect } from 'react';

const dialogShortcuts = {
  confirm: {
    keyCombo: 'y',
    name: 'Confirm dialog',
    description: 'Accept the open confirmation dialog',
    scope: ShortcutScope.LOCAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    type: ShortcutType.REGULAR,
  },
  dismiss: {
    keyCombo: 'n',
    name: 'Dismiss dialog',
    description: 'Reject or close the open confirmation dialog',
    scope: ShortcutScope.LOCAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    type: ShortcutType.REGULAR,
  },
  dismissEscape: {
    keyCombo: 'esc',
    name: 'Dismiss dialog (Escape)',
    description: 'Reject or close the open confirmation dialog',
    scope: ShortcutScope.LOCAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    type: ShortcutType.REGULAR,
  },
} satisfies ShortcutSettings;

const isEditableElement = (el: Element | null): boolean =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLTextAreaElement ||
  (el instanceof HTMLElement && el.isContentEditable);

type ConfirmationKeyhubProviderProps = PropsWithChildren<{
  dialogRef: RefObject<HTMLElement | null>;
  onConfirm?: () => void;
  onDismiss?: () => void;
  isValid?: boolean;
}>;

// Tab-trapping is handled by <FocusTrap> (see ConfirmationProvider.tsx), which has
// escapeDeactivates: false -- Escape-to-dismiss is owned here instead, alongside the dialog's own
// y/n hotkeys, scoped to the dialog element the same way.
export const ConfirmationKeyhubProvider = ({
  children,
  dialogRef,
  onConfirm,
  onDismiss,
  isValid,
}: ConfirmationKeyhubProviderProps) => {
  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) return;

    const eventBus = new EventBus(dialogShortcuts, {
      target: dialogElement,
      ignoreInputFields: false,
    });
    eventBus.on('confirm', () => {
      if (!isEditableElement(document.activeElement) && isValid !== false) onConfirm?.();
    });
    eventBus.on('dismiss', () => {
      if (!isEditableElement(document.activeElement)) onDismiss?.();
    });
    // Escape closes the dialog even while a text field inside it has focus -- unlike 'n', it isn't
    // a printable character, so there's no risk of it clashing with the user typing.
    eventBus.on('dismissEscape', () => {
      onDismiss?.();
    });

    return () => eventBus.destroy();
  }, [dialogRef, onConfirm, onDismiss, isValid]);

  return <>{children}</>;
};

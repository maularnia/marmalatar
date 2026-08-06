import {
  ShortcutScope,
  ShortcutSettings,
  ShortcutStatus,
  ShortcutType,
  useShortcut,
} from 'react-keyhub';
import KeystrokeZone from '@src/layout/components/KeystrokeZone/KeystrokeZone';
import { useMenuActions } from '@providers/MenuActionsProvider';
import { useMainMenuState } from '@providers/MenuStateProvider';
import { PropsWithChildren, useEffect, useState } from 'react';

const myShortcuts = {
  previousMenuItem: {
    keyCombo: 'up',
    name: 'Previous menu item',
    description: 'Focus the previous project/prompt template/glossary in the sidebar',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Menu',
    type: ShortcutType.REGULAR,
  },
  nextMenuItem: {
    keyCombo: 'down',
    name: 'Next menu item',
    description: 'Focus the next project/prompt template/glossary in the sidebar',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Menu',
    type: ShortcutType.REGULAR,
  },
  renameFocusedItem: {
    keyCombo: 'ctrl+r',
    name: 'Rename focused item',
    description: 'Start renaming the currently focused sidebar item',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Menu',
    type: ShortcutType.REGULAR,
  },
  deleteFocusedItemDelete: {
    keyCombo: 'delete',
    name: 'Delete focused item',
    description: 'Delete the currently focused project/prompt template/glossary',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Menu',
    type: ShortcutType.REGULAR,
  },
  openFocusedItem: {
    keyCombo: 'space',
    name: 'Open focused item',
    description: 'Open the currently focused project/prompt template/glossary',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Menu',
    type: ShortcutType.REGULAR,
  },
} satisfies ShortcutSettings;

const useAppMenuKeyStroke = (
  keystroke: keyof typeof myShortcuts,
  action: (event: KeyboardEvent) => void
) => useShortcut(keystroke, action);

// Registers useShortcut handlers -- must render as KeystrokeZone's child so these hooks run inside
// the KeyHubProvider context KeystrokeZone creates for `shortcuts`. Delegates entirely to
// MenuActionsProvider's own "FocusedItem" handlers rather than reaching into its refs/getters
// (combinedItems, getFocusedItem, renamingKey) directly -- this component just maps keys to actions.
function MenuShortcuts() {
  const {
    handleMoveMenuFocus,
    handleRenameFocusedItem,
    handleDeleteFocusedItem,
    handleOpenFocusedItem,
  } = useMenuActions();

  useAppMenuKeyStroke('previousMenuItem', () => handleMoveMenuFocus('up'));
  useAppMenuKeyStroke('nextMenuItem', () => handleMoveMenuFocus('down'));

  useAppMenuKeyStroke('renameFocusedItem', () => handleRenameFocusedItem());

  useAppMenuKeyStroke('deleteFocusedItemDelete', (event: KeyboardEvent) => {
    event.preventDefault();
    handleDeleteFocusedItem();
  });

  // ignoreInputFields:false means this shortcut would otherwise fire in parallel with a rename
  // input's own Enter/Space handling -- handleOpenFocusedItem itself no-ops while renaming.
  useAppMenuKeyStroke('openFocusedItem', () => handleOpenFocusedItem());

  return null;
}

export default function MenuKeystrokeProvider({ children }: PropsWithChildren) {
  return <MenuKeystrokeBody>{children}</MenuKeystrokeBody>;
}

// Separate from KeystrokeZone's own shortcut-gating story -- reactively tracks whether focus
// currently lives anywhere within the menu, purely to keep a dynamic/collapsible sidebar expanded
// while a row (or a create button) is focused, instead of collapsing out from under it on
// mouseleave. Lives here (outside KeystrokeZone's own KeyHubProvider subtree) since it doesn't
// need shortcut context, unlike <MenuShortcuts/> below.
function MenuKeystrokeBody({ children }: PropsWithChildren) {
  const { renamingKey, isCreatingPromptTemplate, isCreatingGlossary } = useMenuActions();
  const { setStaleOpen } = useMainMenuState();

  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const staleOpen =
    isFocusWithin || renamingKey != null || isCreatingPromptTemplate || isCreatingGlossary;
  useEffect(() => {
    setStaleOpen(staleOpen);
  }, [staleOpen, setStaleOpen]);

  return (
    <KeystrokeZone
      shortcuts={myShortcuts}
      ignoreEditableElements
      shortcutOptions={{
        preventDefault: true,
        stopPropagation: true,
        debounceTime: 0,
        sequenceTimeout: 500,
        ignoreInputFields: false,
        ignoreModifierOnlyEvents: true,
      }}
      onFocusWithinChange={setIsFocusWithin}
      hint={{ corner: 'bottom-left' }}
    >
      <MenuShortcuts />
      {children}
    </KeystrokeZone>
  );
}

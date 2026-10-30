import {
  ShortcutScope,
  ShortcutSettings,
  ShortcutStatus,
  ShortcutType,
  useShortcut,
} from 'react-keyhub';
import KeystrokeZone from '@src/layout/components/KeystrokeZone/KeystrokeZone';
import { useGlossaryActions } from '@providers/GlossaryActionsProvider';
import { PropsWithChildren } from 'react';

const myShortcuts = {
  previousPairInput: {
    keyCombo: 'alt+up',
    name: 'Go to previous pair',
    description: 'Focus same column of the previous glossary pair',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Glossary',
    type: ShortcutType.REGULAR,
  },
  nextPairInput: {
    keyCombo: 'alt+down',
    name: 'Go to next pair',
    description: 'Focus same column of the next glossary pair',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Glossary',
    type: ShortcutType.REGULAR,
  },
  focusOriginalColumn: {
    keyCombo: 'alt+left',
    name: 'Go to original column',
    description: 'Focus the original-text column of the focused pair',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Glossary',
    type: ShortcutType.REGULAR,
  },
  focusTranslationColumn: {
    keyCombo: 'alt+right',
    name: 'Go to translation column',
    description: 'Focus the translation column of the focused pair',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Glossary',
    type: ShortcutType.REGULAR,
  },
  deletePair: {
    keyCombo: 'alt+backspace',
    name: 'Remove focused pair',
    description: 'Removes the currently focused glossary pair',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Glossary',
    type: ShortcutType.REGULAR,
  },
  deletePairDelete: {
    keyCombo: 'alt+delete',
    name: 'Remove focused pair',
    description: 'Removes the currently focused glossary pair',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Glossary',
    type: ShortcutType.REGULAR,
  },
  insertPairBefore: {
    keyCombo: 'alt+,',
    name: 'Insert pair before',
    description: 'Inserts a new empty pair before the focused glossary pair',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Glossary',
    type: ShortcutType.REGULAR,
  },
  insertPairAfter: {
    keyCombo: 'alt+.',
    name: 'Insert pair after',
    description: 'Inserts a new empty pair after the focused glossary pair',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Glossary',
    type: ShortcutType.REGULAR,
  },
} satisfies ShortcutSettings;

const useAppGlossaryKeystroke = (
  keystroke: keyof typeof myShortcuts,
  action: (event: KeyboardEvent) => void
) => useShortcut(keystroke, action);

export function GlossaryKeystrokeProvider({ children }: PropsWithChildren) {
  return (
    <KeystrokeZone
      shortcuts={myShortcuts}
      shortcutOptions={{
        preventDefault: true,
        stopPropagation: true,
        debounceTime: 0,
        sequenceTimeout: 500,
        ignoreInputFields: false,
        ignoreModifierOnlyEvents: true,
      }}
    >
      <GlossaryShortcuts />
      {children}
    </KeystrokeZone>
  );
}

// Registers useShortcut handlers -- must render as KeystrokeZone's child so these hooks run inside
// the KeyHubProvider context KeystrokeZone creates for `shortcuts`.
function GlossaryShortcuts() {
  const {
    focusedPairIndex,
    focusedColumn,
    handleFocusPairInput,
    handleMovePairFocus,
    handleDeletePair,
    handleInsertPair,
  } = useGlossaryActions();

  useAppGlossaryKeystroke('previousPairInput', () => handleMovePairFocus('up'));
  useAppGlossaryKeystroke('nextPairInput', () => handleMovePairFocus('down'));

  useAppGlossaryKeystroke('focusOriginalColumn', () => {
    if (focusedColumn === 'original') return;
    handleFocusPairInput(focusedPairIndex ?? 0, 'original');
  });

  useAppGlossaryKeystroke('focusTranslationColumn', () => {
    if (focusedColumn === 'translation') return;
    handleFocusPairInput(focusedPairIndex ?? 0, 'translation');
  });

  const handleDeletePairKeystroke = (event: KeyboardEvent) => {
    if (focusedPairIndex == null) return;
    event.preventDefault();
    handleDeletePair(focusedPairIndex);
  };

  useAppGlossaryKeystroke('deletePair', handleDeletePairKeystroke);
  useAppGlossaryKeystroke('deletePairDelete', handleDeletePairKeystroke);

  useAppGlossaryKeystroke('insertPairBefore', (event) => {
    if (focusedPairIndex == null) return;
    event.preventDefault();
    handleInsertPair(focusedPairIndex, 'before');
  });

  useAppGlossaryKeystroke('insertPairAfter', (event) => {
    if (focusedPairIndex == null) return;
    event.preventDefault();
    handleInsertPair(focusedPairIndex, 'after');
  });

  return null;
}

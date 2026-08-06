import { providerNoop } from '@utils/noop';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { setThemeSelection } from '@store/slices/app';
import { closeOverlays, selectCurrentOverlay } from '@store/slices/overlays';
import { openExportOverlay, openSettingsOverlay } from '@store/thunks';
import { TThemeSelection } from '@src/types';
import {
  KeyHubProvider,
  ShortcutScope,
  ShortcutSettings,
  ShortcutStatus,
  ShortcutType,
  useShortcut,
  useShortcutPause,
} from 'react-keyhub';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TGlobalKeystrokeContext, TKeystrokeSlot } from './types';

const globalShortcuts = {
  focusSlot1: {
    keyCombo: 'ctrl+1',
    name: 'Focus zone 1',
    description: 'Focus keystroke zone 1',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Global',
    type: ShortcutType.REGULAR,
  },
  focusSlot2: {
    keyCombo: 'ctrl+2',
    name: 'Focus zone 2',
    description: 'Focus keystroke zone 2',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Global',
    type: ShortcutType.REGULAR,
  },
  focusSlot3: {
    keyCombo: 'ctrl+3',
    name: 'Focus zone 3',
    description: 'Focus keystroke zone 3',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Global',
    type: ShortcutType.REGULAR,
  },
  focusSlot4: {
    keyCombo: 'ctrl+4',
    name: 'Focus zone 4',
    description: 'Focus keystroke zone 4',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Global',
    type: ShortcutType.REGULAR,
  },
  focusSlot5: {
    keyCombo: 'ctrl+5',
    name: 'Focus zone 5',
    description: 'Focus keystroke zone 5',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Global',
    type: ShortcutType.REGULAR,
  },
  focusSlot6: {
    keyCombo: 'ctrl+6',
    name: 'Focus zone 6',
    description: 'Focus keystroke zone 6',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Global',
    type: ShortcutType.REGULAR,
  },
  focusSlot7: {
    keyCombo: 'ctrl+7',
    name: 'Focus zone 7',
    description: 'Focus keystroke zone 7',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Global',
    type: ShortcutType.REGULAR,
  },
  focusSlot8: {
    keyCombo: 'ctrl+8',
    name: 'Focus zone 8',
    description: 'Focus keystroke zone 8',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Global',
    type: ShortcutType.REGULAR,
  },
  focusSlot9: {
    keyCombo: 'ctrl+9',
    name: 'Focus zone 9',
    description: 'Focus keystroke zone 9',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Global',
    type: ShortcutType.REGULAR,
  },
  focusSlot0: {
    keyCombo: 'ctrl+0',
    name: 'Focus zone 0',
    description: 'Focus keystroke zone 0',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Global',
    type: ShortcutType.REGULAR,
  },
  closeOverlay: {
    keyCombo: 'esc',
    name: 'Close overlay',
    description: 'Closes the currently open overlay, if any',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Global',
    type: ShortcutType.REGULAR,
  },
  openSettings: {
    keyCombo: 'ctrl+s',
    name: 'Open settings',
    description: 'Instantly opens the settings overlay',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Global',
    type: ShortcutType.REGULAR,
  },
  openExport: {
    keyCombo: 'ctrl+e',
    name: 'Open export',
    description: 'Instantly opens the export overlay',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Global',
    type: ShortcutType.REGULAR,
  },
  switchToDarkTheme: {
    keyCombo: 'f1',
    name: 'Switch to dark theme',
    description: 'Switch the UI theme to dark',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Global',
    type: ShortcutType.REGULAR,
  },
  switchToLightTheme: {
    keyCombo: 'f2',
    name: 'Switch to light theme',
    description: 'Switch the UI theme to light',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Global',
    type: ShortcutType.REGULAR,
  },
  switchToSystemTheme: {
    keyCombo: 'f3',
    name: 'Switch to system theme',
    description: 'Switch the UI theme to follow the system setting',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Global',
    type: ShortcutType.REGULAR,
  },
} satisfies ShortcutSettings;

type TGlobalShortcuts = typeof globalShortcuts;

const SLOT_ORDER: TKeystrokeSlot[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

const noop = providerNoop('GlobalKeystrokeContext');

const GlobalKeystrokeContext = createContext<TGlobalKeystrokeContext>({
  registerZone: noop,
  unregisterZone: noop,
  setPaused: noop,
});

export const useGlobalKeystrokeRegistry = () => useContext(GlobalKeystrokeContext);

const useAppGlobalKeyStroke = (
  keystroke: keyof TGlobalShortcuts,
  action: (event: KeyboardEvent) => void
) => useShortcut(keystroke, action);

// Must render inside KeyHubProvider (needs its context for useShortcut/useShortcutPause) and must
// itself wrap ConfirmationProvider, so Confirmation can reach `useGlobalKeystrokePause` via React
// context regardless of where its dialogs are portaled.
function GlobalKeystrokeRegistry({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const currentOverlay = useAppSelector(selectCurrentOverlay);
  const slotsRef = useRef(new Map<TKeystrokeSlot, () => void>());
  const pauseSourcesRef = useRef(new Set<string>());
  const [isPaused, setIsPaused] = useState(false);

  const registerZone = useCallback((focusAction: () => void): TKeystrokeSlot => {
    const slot = SLOT_ORDER.find((candidate) => !slotsRef.current.has(candidate)) ?? SLOT_ORDER[0];
    slotsRef.current.set(slot, focusAction);
    return slot;
  }, []);

  const unregisterZone = useCallback((slot: TKeystrokeSlot) => {
    slotsRef.current.delete(slot);
  }, []);

  const focusSlot = useCallback((slot: TKeystrokeSlot) => {
    slotsRef.current.get(slot)?.();
  }, []);

  const setPaused = useCallback((source: string, paused: boolean) => {
    if (paused) pauseSourcesRef.current.add(source);
    else pauseSourcesRef.current.delete(source);
    setIsPaused(pauseSourcesRef.current.size > 0);
  }, []);

  // While anything (currently: a confirmation dialog) has paused us, none of these shortcuts fire.
  useShortcutPause(isPaused);

  useAppGlobalKeyStroke('focusSlot1', () => focusSlot(1));
  useAppGlobalKeyStroke('focusSlot2', () => focusSlot(2));
  useAppGlobalKeyStroke('focusSlot3', () => focusSlot(3));
  useAppGlobalKeyStroke('focusSlot4', () => focusSlot(4));
  useAppGlobalKeyStroke('focusSlot5', () => focusSlot(5));
  useAppGlobalKeyStroke('focusSlot6', () => focusSlot(6));
  useAppGlobalKeyStroke('focusSlot7', () => focusSlot(7));
  useAppGlobalKeyStroke('focusSlot8', () => focusSlot(8));
  useAppGlobalKeyStroke('focusSlot9', () => focusSlot(9));
  useAppGlobalKeyStroke('focusSlot0', () => focusSlot(0));
  useAppGlobalKeyStroke('closeOverlay', () => {
    if (currentOverlay !== null) dispatch(closeOverlays());
  });
  useAppGlobalKeyStroke('openSettings', () => {
    dispatch(openSettingsOverlay());
  });
  useAppGlobalKeyStroke('openExport', () => {
    dispatch(openExportOverlay());
  });
  useAppGlobalKeyStroke('switchToDarkTheme', () => {
    dispatch(setThemeSelection(TThemeSelection.DARK));
  });
  useAppGlobalKeyStroke('switchToLightTheme', () => {
    dispatch(setThemeSelection(TThemeSelection.LIGHT));
  });
  useAppGlobalKeyStroke('switchToSystemTheme', () => {
    dispatch(setThemeSelection(TThemeSelection.SYSTEM));
  });

  const value = useMemo<TGlobalKeystrokeContext>(
    () => ({ registerZone, unregisterZone, setPaused }),
    [registerZone, unregisterZone, setPaused]
  );

  return (
    <GlobalKeystrokeContext.Provider value={value}>{children}</GlobalKeystrokeContext.Provider>
  );
}

// The one deliberately `document`-scoped EventBus in the app -- these shortcuts must be reachable
// regardless of where focus is. Isolation while a confirmation is open is achieved by
// GlobalKeystrokeRegistry pausing this EventBus via React context, not by narrowing this target.
export default function GlobalKeystrokeDispatcher({ children }: PropsWithChildren) {
  return (
    <KeyHubProvider
      shortcuts={globalShortcuts}
      options={{
        preventDefault: true,
        stopPropagation: false,
        debounceTime: 0,
        sequenceTimeout: 500,
        ignoreInputFields: false,
        ignoreModifierOnlyEvents: true,
        target: document,
      }}
    >
      <GlobalKeystrokeRegistry>{children}</GlobalKeystrokeRegistry>
    </KeyHubProvider>
  );
}

export function useGlobalKeystrokePause(paused: boolean, source = 'default') {
  const { setPaused } = useGlobalKeystrokeRegistry();
  useEffect(() => {
    setPaused(source, paused);
    return () => setPaused(source, false);
  }, [paused, source, setPaused]);
}

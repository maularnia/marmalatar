import { useAppSelector } from '@store/hooks';
import { selectScreenSize } from '@src/store/slices/app';
import { TScreenSize } from '@src/theme/types';
import { providerNoop } from '@src/utils/noop';
import { useMemoizedObject } from '@src/utils/useMemoizedObject';
import { createContext, PropsWithChildren, useContext, useState } from 'react';

type TMenuStateContext = {
  dynamic: boolean;
  compact: boolean;
  setCompact: (compact: boolean) => void;
  setStaleOpen: (staleOpen: boolean) => void;
};

const noop = providerNoop('MenuStateContext');

const MenuStateContext = createContext<TMenuStateContext>({
  dynamic: false,
  compact: false,
  setCompact: noop,
  setStaleOpen: noop,
});

export function useMenuState(): TMenuStateContext {
  return useContext(MenuStateContext);
}

export function MenuStateProvider({ children }: PropsWithChildren) {
  const screenSize = useAppSelector(selectScreenSize);
  const dynamic = screenSize == TScreenSize.MEDIUM || screenSize == TScreenSize.SMALL;
  const [compact, setCompact] = useState(true); // true initially if dynamic
  // A focused item or an in-progress rename/create should keep the menu expanded even after the
  // mouse leaves it -- collapsing out from under a focused/editable row would be disorienting.
  const [staleOpen, setStaleOpen] = useState(false);
  const value = useMemoizedObject<TMenuStateContext>({
    compact: compact && dynamic && !staleOpen,
    dynamic,
    setCompact,
    setStaleOpen,
  });

  return <MenuStateContext.Provider value={value}>{children}</MenuStateContext.Provider>;
}

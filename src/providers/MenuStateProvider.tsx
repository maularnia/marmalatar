import { selectScreenSize } from '@src/store/slices/app';
import { TScreenSize } from '@src/theme/types';
import { providerNoop } from '@src/utils/noop';
import { createContext, PropsWithChildren, useContext, useState } from 'react';
import { useSelector } from 'react-redux';

type MenuStateContextType = {
  dynamic: boolean;
  compact: boolean;
  setCompact: (compact: boolean) => void;
  setStaleOpen: (staleOpen: boolean) => void;
};

const defaultState: MenuStateContextType = {
  dynamic: false,
  compact: false,
  setCompact: providerNoop('Menu State'),
  setStaleOpen: providerNoop('Menu State'),
};

const MenuStateContext = createContext(defaultState);

export const MainMenuStateContextProvider = ({ children }: PropsWithChildren) => {
  const screenSize = useSelector(selectScreenSize);
  const dynamic = screenSize == TScreenSize.MEDIUM || screenSize == TScreenSize.SMALL;
  const [compact, setCompact] = useState(true); // true initially if dynamic
  // A focused item or an in-progress rename/create should keep the menu expanded even after the
  // mouse leaves it -- collapsing out from under a focused/editable row would be disorienting.
  const [staleOpen, setStaleOpen] = useState(false);
  return (
    <MenuStateContext.Provider
      value={{ compact: compact && dynamic && !staleOpen, dynamic, setCompact, setStaleOpen }}
    >
      {children}
    </MenuStateContext.Provider>
  );
};

export const useMainMenuState = (): MenuStateContextType => {
  return useContext(MenuStateContext);
};

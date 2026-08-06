import { providerNoop } from '@src/utils/noop';
import {
  createContext,
  PropsWithChildren,
  RefObject,
  useCallback,
  useContext,
  useRef,
} from 'react';

type MenuRefsContextType = {
  itemRefs: RefObject<Map<string, HTMLElement>>;
  registerMenuItemRef: (key: string, el: HTMLElement | null) => void;
  resetMenuRefs: () => void;
};

const noop = providerNoop('MenuRefsContext');

const MenuRefsContext = createContext<MenuRefsContextType>({
  itemRefs: { current: new Map() },
  registerMenuItemRef: noop,
  resetMenuRefs: noop,
});

export function useMenuRefs(): MenuRefsContextType {
  return useContext(MenuRefsContext);
}

export default function MenuRefsProvider({ children }: PropsWithChildren) {
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  const registerMenuItemRef = useCallback((key: string, el: HTMLElement | null) => {
    const map = itemRefs.current;
    if (el === null) map.delete(key);
    else map.set(key, el);
  }, []);

  const resetMenuRefs = useCallback(() => {
    itemRefs.current = new Map();
  }, []);

  return (
    <MenuRefsContext.Provider value={{ itemRefs, registerMenuItemRef, resetMenuRefs }}>
      {children}
    </MenuRefsContext.Provider>
  );
}

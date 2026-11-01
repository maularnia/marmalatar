import { providerNoop } from '@src/utils/noop';
import { useMemoizedObject } from '@src/utils/useMemoizedObject';
import {
  createContext,
  PropsWithChildren,
  RefObject,
  useCallback,
  useContext,
  useRef,
} from 'react';

type TMenuRefsContext = {
  itemRefs: RefObject<Map<string, HTMLElement>>;
  registerMenuItemRef: (key: string, el: HTMLElement | null) => void;
  resetMenuRefs: () => void;
};

const noop = providerNoop('MenuRefsContext');

const MenuRefsContext = createContext<TMenuRefsContext>({
  itemRefs: { current: new Map() },
  registerMenuItemRef: noop,
  resetMenuRefs: noop,
});

export function useMenuRefs(): TMenuRefsContext {
  return useContext(MenuRefsContext);
}

export function MenuRefsProvider({ children }: PropsWithChildren) {
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  const registerMenuItemRef = useCallback((key: string, el: HTMLElement | null) => {
    const map = itemRefs.current;
    if (el === null) map.delete(key);
    else map.set(key, el);
  }, []);

  const resetMenuRefs = useCallback(() => {
    itemRefs.current = new Map();
  }, []);

  const value = useMemoizedObject<TMenuRefsContext>({
    itemRefs,
    registerMenuItemRef,
    resetMenuRefs,
  });

  return <MenuRefsContext.Provider value={value}>{children}</MenuRefsContext.Provider>;
}

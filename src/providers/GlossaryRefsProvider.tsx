import { selectCurrentGlossary } from '@store/slices/aiPromptEditor';
import { useAppSelector } from '@store/hooks';
import { providerNoop } from '@src/utils/noop';
import {
  createContext,
  PropsWithChildren,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';

export type GlossaryPairColumnType = 'original' | 'translation';

type PairInputMap = {
  original: HTMLElement | null;
  translation: HTMLElement | null;
};

type GlossaryRefsContextType = {
  pairInputRefs: RefObject<Map<number, PairInputMap>>;
  registerGlossaryPairInputRef: (
    pairIndex: number,
    type: GlossaryPairColumnType,
    el: HTMLElement | null
  ) => void;
};

const noop = providerNoop('GlossaryRefsContext');

const GlossaryRefsContext = createContext<GlossaryRefsContextType>({
  pairInputRefs: { current: new Map() },
  registerGlossaryPairInputRef: noop,
});

export function useGlossaryRefs(): GlossaryRefsContextType {
  return useContext(GlossaryRefsContext);
}

export default function GlossaryRefsProvider({ children }: PropsWithChildren) {
  const pairInputRefs = useRef<Map<number, PairInputMap>>(new Map());
  // Switching to a different glossary while the overlay stays mounted (e.g. picking another
  // glossary from the menu without closing this one first) doesn't remount this provider --
  // currentGlossary is the one signal that reliably changes on every such switch, so refs are
  // cleared reactively instead of relying on a caller to remember to reset them.
  const currentGlossary = useAppSelector(selectCurrentGlossary);
  useEffect(() => {
    pairInputRefs.current = new Map();
  }, [currentGlossary]);

  const registerGlossaryPairInputRef = useCallback(
    (pairIndex: number, type: GlossaryPairColumnType, el: HTMLElement | null) => {
      const map = pairInputRefs.current;
      if (el === null) {
        const row = map.get(pairIndex);
        if (!row) return;
        row[type] = null;
        if (!row.original && !row.translation) map.delete(pairIndex);
      } else {
        const row = map.get(pairIndex) ?? { original: null, translation: null };
        row[type] = el;
        map.set(pairIndex, row);
      }
    },
    []
  );

  return (
    <GlossaryRefsContext.Provider
      value={{
        pairInputRefs,
        registerGlossaryPairInputRef,
      }}
    >
      {children}
    </GlossaryRefsContext.Provider>
  );
}

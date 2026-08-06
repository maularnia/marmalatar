import { GlossaryPairColumnType, useGlossaryRefs } from '@providers/GlossaryRefsProvider';
import { useDeleteGlossaryEntryConfirmation } from '@src/segments/dialogs/deleteGlossaryEntry/useDeleteGlossaryEntryConfirmation';
import { focusContentEditableToEnd, selectAllContentEditable } from '@src/utils/contentEditable';
import { providerNoop } from '@src/utils/noop';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fromCurrentStore } from '@store/store';
import {
  selectCurrentGlossary,
  selectGlossaryData,
  setGlossaryData,
} from '@store/slices/aiPromptEditor';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type GlossaryActionsContextType = {
  focusedPairIndex: number | null;
  focusedColumn: GlossaryPairColumnType | null;
  handleFocusPairInput: (
    pairIndex: number,
    column: GlossaryPairColumnType,
    selectAll?: boolean
  ) => boolean;
  handleSetFocusedPair: (pairIndex: number, column?: GlossaryPairColumnType) => void;
  handleInsertPair: (pairIndex: number, position: 'before' | 'after') => void;
  handleDeletePair: (pairIndex: number) => Promise<void>;
};

const noop = providerNoop('GlossaryActionsContext');

const GlossaryActionsContext = createContext<GlossaryActionsContextType>({
  focusedPairIndex: null,
  focusedColumn: null,
  handleFocusPairInput: noop,
  handleSetFocusedPair: noop,
  handleInsertPair: noop,
  handleDeletePair: noop,
});

export function useGlossaryActions(): GlossaryActionsContextType {
  return useContext(GlossaryActionsContext);
}

export default function GlossaryActionsProvider({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const { pairInputRefs } = useGlossaryRefs();
  const { confirmDeleteGlossaryEntry } = useDeleteGlossaryEntryConfirmation();

  const [focusedPairIndex, setFocusedPairIndex] = useState<number | null>(null);
  const [focusedColumn, setFocusedColumn] = useState<GlossaryPairColumnType | null>(null);

  // Switching to a different glossary while the overlay stays mounted doesn't remount this
  // provider (see GlossaryRefsProvider) -- clear stale focus reactively on that same signal.
  const currentGlossary = useAppSelector(selectCurrentGlossary);
  useEffect(() => {
    setFocusedPairIndex(null);
    setFocusedColumn(null);
  }, [currentGlossary]);

  const handleFocusPairInput = useCallback(
    (pairIndex: number, column: GlossaryPairColumnType, selectAll = false): boolean => {
      const el = pairInputRefs.current.get(pairIndex)?.[column];
      if (!el) return false;
      if (selectAll) selectAllContentEditable(el);
      else focusContentEditableToEnd(el);
      el.scrollIntoView({ block: 'nearest' });
      setFocusedPairIndex(pairIndex);
      setFocusedColumn(column);
      return true;
    },
    [pairInputRefs]
  );

  const handleSetFocusedPair = useCallback((pairIndex: number, column?: GlossaryPairColumnType) => {
    setFocusedPairIndex(pairIndex);
    if (column) setFocusedColumn(column);
  }, []);

  const handleInsertPair = useCallback(
    (pairIndex: number, position: 'before' | 'after') => {
      const glossaryData = fromCurrentStore(selectGlossaryData);
      if (!glossaryData) return;
      const targetIndex = position === 'before' ? pairIndex : pairIndex + 1;
      const list = [
        ...glossaryData.list.slice(0, targetIndex),
        { original: '', translation: '' },
        ...glossaryData.list.slice(targetIndex),
      ];
      dispatch(setGlossaryData({ ...glossaryData, list }));
      const column = focusedColumn ?? 'original';
      requestAnimationFrame(() => {
        handleFocusPairInput(targetIndex, column, false);
      });
    },
    [dispatch, focusedColumn, handleFocusPairInput]
  );

  const handleDeletePair = useCallback(
    async (pairIndex: number) => {
      const glossaryData = fromCurrentStore(selectGlossaryData);
      if (!glossaryData) return;
      const pair = glossaryData.list[pairIndex];
      if (!pair) return;
      const confirmed = await confirmDeleteGlossaryEntry({
        original: pair.original,
        translation: pair.translation,
      });
      if (!confirmed) return;
      const hasNext = pairIndex + 1 < glossaryData.list.length;
      const hasPrev = pairIndex > 0;
      const list = glossaryData.list.filter((_, i) => i !== pairIndex);
      dispatch(setGlossaryData({ ...glossaryData, list }));
      const targetIndex = hasNext ? pairIndex : hasPrev ? pairIndex - 1 : null;
      const column = focusedColumn ?? 'original';
      if (targetIndex != null) {
        requestAnimationFrame(() => {
          handleFocusPairInput(targetIndex, column, false);
        });
      } else {
        setFocusedPairIndex(null);
        setFocusedColumn(null);
      }
    },
    [confirmDeleteGlossaryEntry, dispatch, focusedColumn, handleFocusPairInput]
  );

  const value = useMemo<GlossaryActionsContextType>(
    () => ({
      focusedPairIndex,
      focusedColumn,
      handleFocusPairInput,
      handleSetFocusedPair,
      handleInsertPair,
      handleDeletePair,
    }),
    [
      focusedPairIndex,
      focusedColumn,
      handleFocusPairInput,
      handleSetFocusedPair,
      handleInsertPair,
      handleDeletePair,
    ]
  );

  return (
    <GlossaryActionsContext.Provider value={value}>{children}</GlossaryActionsContext.Provider>
  );
}

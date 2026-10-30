import { selectProjectId } from '@src/store/slices/project';
import { providerNoop } from '@src/utils/noop';
import { useMemoizedObject } from '@src/utils/useMemoizedObject';
import { useAppSelector } from '@store/hooks';
import {
  createContext,
  PropsWithChildren,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';

export type TInputColumn = 'source' | 'output' | 'character';

type TRowInputMap = {
  source: HTMLElement | null;
  output: HTMLElement | null;
  character: HTMLElement | null;
};

type TEditorRefsContext = {
  splitCursorRef: RefObject<number | null>;
  lineInputRefs: RefObject<Map<number, TRowInputMap>>;
  registerLineInputRef: (lineIndex: number, type: TInputColumn, el: HTMLElement | null) => void;
};

const noop = providerNoop('EditorRefsContext');

const EditorRefsContext = createContext<TEditorRefsContext>({
  splitCursorRef: { current: null },
  lineInputRefs: { current: new Map() },
  registerLineInputRef: noop,
});

export function useEditorRefs(): TEditorRefsContext {
  return useContext(EditorRefsContext);
}

export function EditorRefsProvider({ children }: PropsWithChildren) {
  const splitCursorRef = useRef<number | null>(null);
  const lineInputRefs = useRef<Map<number, TRowInputMap>>(new Map());
  const projectId = useAppSelector(selectProjectId);

  const registerLineInputRef = useCallback(
    (lineIndex: number, type: TInputColumn, el: HTMLElement | null) => {
      const map = lineInputRefs.current;
      if (el === null) {
        const row = map.get(lineIndex);
        if (!row) return;
        row[type] = null;
        if (!row.source && !row.output && !row.character) map.delete(lineIndex);
      } else {
        const row = map.get(lineIndex) ?? {
          source: null,
          output: null,
          character: null,
        };
        row[type] = el;
        map.set(lineIndex, row);
      }
    },
    []
  );

  // An in-progress split cursor is only ever meaningful for the project that registered it --
  // whenever the open project changes (new project, switching to a different one, or closing
  // back to none), a stale offset could otherwise be misread against the next project's
  // differently-indexed lines. lineInputRefs doesn't need the same treatment: each row registers
  // itself on mount and nulls its own entries out on unmount (EditorTableLine.tsx), so the map is
  // already self-cleaning as rows for the old project unmount and rows for the new project mount.
  useEffect(() => {
    splitCursorRef.current = null;
  }, [projectId]);

  const value = useMemoizedObject<TEditorRefsContext>({
    splitCursorRef,
    lineInputRefs,
    registerLineInputRef,
  });

  return <EditorRefsContext.Provider value={value}>{children}</EditorRefsContext.Provider>;
}

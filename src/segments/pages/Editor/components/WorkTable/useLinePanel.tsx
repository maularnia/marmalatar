import { useEditorActions } from '@providers/EditorActionsProvider';
import { selectAutoMarkLinesCompleted } from '@src/store/slices/app';
import { selectFocusedLineIndex, selectLines } from '@src/store/slices/editor';
import { useAppSelector } from '@store/hooks';
import { cloneElement, type ReactElement, type ReactNode, useEffect, useMemo, useRef } from 'react';
import { shallowEqual } from 'react-redux';
import { EditorTableLinePanel } from './WorkTableLine/EditorTableLinePanel';

export function useLinePanel() {
  const { handleRemoveLine, handleToggleCompleted } = useEditorActions();
  const { translationLines, autoMarkLinesCompleted, focusedLineIndex } = useAppSelector(
    (state) => ({
      translationLines: selectLines(state),
      autoMarkLinesCompleted: selectAutoMarkLinesCompleted(state),
      focusedLineIndex: selectFocusedLineIndex(state),
    }),
    shallowEqual
  );

  const focusedClonedNodeRef = useRef<{
    baseNode: ReactElement;
    panelNode: ReactNode;
    result: ReactElement;
  } | null>(null);

  useEffect(() => {
    focusedClonedNodeRef.current = null;
  }, [focusedLineIndex]);

  const focusedLine =
    focusedLineIndex != null ? (translationLines[focusedLineIndex] ?? null) : null;
  const panelNode = useMemo((): ReactNode => {
    if (focusedLineIndex == null || !focusedLine) return null;
    return (
      <EditorTableLinePanel
        isCompleted={Boolean(focusedLine.completed)}
        isCompletedToggleHidden={autoMarkLinesCompleted}
        onRemove={() => handleRemoveLine(focusedLineIndex)}
        onToggleCompleted={() => handleToggleCompleted(focusedLineIndex)}
      />
    );
  }, [
    focusedLineIndex,
    focusedLine,
    autoMarkLinesCompleted,
    handleRemoveLine,
    handleToggleCompleted,
  ]);

  const injectPanel = (baseNode: ReactElement): ReactElement => {
    if (
      focusedClonedNodeRef.current?.baseNode === baseNode &&
      focusedClonedNodeRef.current?.panelNode === panelNode
    ) {
      return focusedClonedNodeRef.current.result;
    }
    const result = cloneElement(baseNode as ReactElement<Record<string, unknown>>, {
      panelNode,
    });
    focusedClonedNodeRef.current = { baseNode, panelNode, result };
    return result;
  };

  return { injectPanel };
}

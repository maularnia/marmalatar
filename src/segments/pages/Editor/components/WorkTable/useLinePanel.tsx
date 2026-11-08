import { settings } from '@src/services/settings';
import { editor } from '@src/services/project';
import { useAppSelectors } from '@store/hooks';
import { cloneElement, type ReactElement, type ReactNode, useEffect, useMemo, useRef } from 'react';
import { EditorTableLinePanel } from './WorkTableLine/EditorTableLinePanel';

export function useLinePanel() {
  const [translationLines, autoMarkLinesCompleted, focusedLineIndex] = useAppSelectors(
    editor.selectLines,
    settings.selectAutoMarkLinesCompleted,
    editor.selectFocusedLineIndex
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
        onRemove={() => editor.removeLine(focusedLineIndex)}
        onToggleCompleted={() => editor.toggleCompleted(focusedLineIndex)}
      />
    );
  }, [focusedLineIndex, focusedLine, autoMarkLinesCompleted]);

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

import { ai } from '@src/services/ai';
import { editor } from '@src/services/project';
import { settings } from '@src/services/settings';
import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { useAppSelectors } from '@store/hooks';
import { memo } from 'react';
import styled from 'styled-components';
import { EditorTableLinePanel } from './EditorTableLinePanel';
import { LineTempoStats } from './LineTempoStats';

// Rendered as static content of the VirtualizedList (inside the scroll container), so it scrolls
// with the rows natively and only needs repositioning when the focused row's top moves.
// z-index sits above the focused row's own (3): the panel precedes the rows in DOM order.
// The -50% vertical shift is passed through motion's `y` rather than a CSS transform, since
// motion owns the element's transform and would overwrite it.
const LinePanelSlot = styled.div`
  position: absolute;
  z-index: 4;
  right: 0;
  transform: translate3d(0, -50%, 0);
  display: flex;
  align-items: center;
  background: ${CSSColor(ThemeColors.BG, TShade.DEFAULT, 5)};
  border-radius: ${CSSVar('size4')};
  backdrop-filter: blur(${CSSVar('blurHeavy')});
`;

type TFocusedLinePanelProps = {
  /** Top of the focused row within the list's content, or null when there's nothing to anchor to */
  top: number | null;
};

export const FocusedLinePanel = memo(function FocusedLinePanel({ top }: TFocusedLinePanelProps) {
  const [focusedLineIndex, lines, frozenLineNumbers, autoMarkLinesCompleted, isTranslationBusy] =
    useAppSelectors(
      editor.selectFocusedLineIndex,
      editor.selectLines,
      editor.selectFrozenLineNumbers,
      settings.selectAutoMarkLinesCompleted,
      ai.selectIsBusy
    );

  const focusedLine = focusedLineIndex != null ? lines[focusedLineIndex] : undefined;
  if (
    top == null ||
    focusedLineIndex == null ||
    !focusedLine ||
    isTranslationBusy ||
    frozenLineNumbers.includes(focusedLine.line_no)
  ) {
    return null;
  }

  return (
    // initial={false}: the first placement (and re-mount after frozen/busy) lands in place;
    // only subsequent top changes animate.
    <LinePanelSlot style={{ top: top }}>
      <LineTempoStats lineIndex={focusedLineIndex} />
      <EditorTableLinePanel
        isCompleted={Boolean(focusedLine.completed)}
        isCompletedToggleHidden={autoMarkLinesCompleted}
        onRemove={() => editor.removeLine(focusedLineIndex)}
        onToggleCompleted={() => editor.toggleCompleted(focusedLineIndex)}
      />
    </LinePanelSlot>
  );
});

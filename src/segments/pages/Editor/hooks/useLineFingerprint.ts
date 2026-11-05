import { media } from '@src/services/media';
import { useEditorKeystroke } from '@providers/EditorKeystrokeProvider';
import { settings } from '@src/services/settings';
import { editor } from '@src/services/project';
import { TSubtitleLine } from '@src/types';
import { useAppSelectors } from '@store/hooks';
import { ai } from '@src/services/ai';
import { useMemo } from 'react';

type LineRenderKeyProps = {
  lineNo: number;
  startTime: number;
  endTime: number;
  sourceText: string;
  translatedText: string;
  character: string;
  characterOptionsHash: string;
  completed: boolean;
  isFocused: boolean;
  isActive: boolean;
  isBeyondVideo: boolean;
  isMergeCandidate: boolean;
  isFrozen: boolean;
  isAiAvailable: boolean;
  ctrlMask: number;
  editorMode: 'edit' | 'translate';
};

function buildCacheKey(props: LineRenderKeyProps): string {
  return [
    props.lineNo,
    props.startTime,
    props.endTime,
    props.sourceText,
    props.translatedText,
    props.character,
    props.characterOptionsHash,
    props.completed ? 1 : 0,
    props.isFocused ? 1 : 0,
    props.isActive ? 1 : 0,
    props.isBeyondVideo ? 1 : 0,
    props.isMergeCandidate ? 1 : 0,
    props.isFrozen ? 1 : 0,
    props.isAiAvailable ? 1 : 0,
    props.ctrlMask,
    props.editorMode,
  ].join('::');
}

export function useLineFingerprint() {
  const { isCtrlPressed, isAltPressed, isCtrlAltPressed, isAltShiftPressed } = useEditorKeystroke();

  const [
    translationLines,
    frozenLineNumbers,
    integrationIsConfigured,
    translationIsBusy,
    characterOptions,
    focusedLineIndex,
    activeLineIndex,
    editorMode,
    videoDurationMs,
  ] = useAppSelectors(
    editor.selectLines,
    editor.selectFrozenLineNumbers,
    settings.selectIntegrationIsConfigured,
    ai.selectIsBusy,
    editor.selectCharacterPool,
    editor.selectFocusedLineIndex,
    media.selectActiveLineIndex,
    editor.selectMode,
    media.selectVideoDurationMs
  );

  const characterOptionsHash = useMemo(
    () => characterOptions.map((item) => `${item.name}:${item.color}`).join('|'),
    [characterOptions]
  );

  const mergeCandidateLineIndices = useMemo(() => {
    if (!isAltShiftPressed || focusedLineIndex == null) return new Set<number>();
    const candidates = new Set<number>();
    if (focusedLineIndex > 0) candidates.add(focusedLineIndex - 1);
    if (focusedLineIndex < translationLines.length - 1) candidates.add(focusedLineIndex + 1);
    return candidates;
  }, [focusedLineIndex, isAltShiftPressed, translationLines.length]);

  const getLineFingerprint = (line: TSubtitleLine, lineIndex: number): string => {
    const translatedText = line.output ?? '';
    const isFocused = focusedLineIndex === lineIndex;
    const isMergeCandidate = mergeCandidateLineIndices.has(lineIndex);
    const isFrozen = frozenLineNumbers.includes(line.line_no);
    const ctrlMask = isFocused
      ? (isCtrlPressed ? 1 : 0) +
        (isAltShiftPressed ? 2 : 0) +
        (isCtrlAltPressed ? 4 : 0) +
        (isAltPressed ? 8 : 0)
      : 0;
    const isAiAvailable = integrationIsConfigured && !translationIsBusy;
    return buildCacheKey({
      lineNo: line.line_no,
      startTime: line.start_time,
      endTime: line.end_time,
      sourceText: line.input,
      translatedText,
      character: line.character ?? '',
      characterOptionsHash,
      completed: Boolean(line.completed),
      isFocused,
      isActive: activeLineIndex === lineIndex,
      isBeyondVideo: Boolean(
        videoDurationMs != null &&
        (line.start_time > videoDurationMs || line.end_time > videoDurationMs)
      ),
      isMergeCandidate,
      isFrozen,
      isAiAvailable,
      ctrlMask,
      editorMode,
    });
  };

  return { getLineFingerprint, mergeCandidateLineIndices };
}

import { EditorKeystrokeContext } from '@providers/EditorKeystrokeProvider';
import { useVideo } from '@providers/VideoProvider';
import { selectIntegrationIsConfigured } from '@src/store/slices/app';
import {
  selectActiveLineIndex,
  selectCharacterPool,
  selectFocusedLineIndex,
  selectLines,
} from '@src/store/slices/editor';
import { selectEditorMode } from '@src/store/slices/project';
import { selectFrozenLineNumbers } from '@src/store/slices/prompt';
import { TSubtitleLine } from '@src/types';
import { useAppSelector } from '@store/hooks';
import { selectTranslationIsBusy } from '@store/slices/aiTranslation';
import { useContext, useMemo } from 'react';
import { shallowEqual } from 'react-redux';

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
  const { videoDurationMs } = useVideo();

  const { isCtrlPressed, isAltPressed, isCtrlAltPressed, isAltShiftPressed } =
    useContext(EditorKeystrokeContext);

  const {
    translationLines,
    frozenLineNumbers,
    integrationIsConfigured,
    translationIsBusy,
    characterOptions,
    focusedLineIndex,
    activeLineIndex,
    editorMode,
  } = useAppSelector(
    (state) => ({
      translationLines: selectLines(state),
      frozenLineNumbers: selectFrozenLineNumbers(state),
      integrationIsConfigured: selectIntegrationIsConfigured(state),
      translationIsBusy: selectTranslationIsBusy(state),
      characterOptions: selectCharacterPool(state),
      focusedLineIndex: selectFocusedLineIndex(state),
      activeLineIndex: selectActiveLineIndex(state),
      editorMode: selectEditorMode(state),
    }),
    shallowEqual
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

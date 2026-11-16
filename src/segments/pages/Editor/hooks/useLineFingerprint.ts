import { media } from '@src/services/media';
import { useEditorKeystroke } from '@providers/EditorKeystrokeProvider';
import { settings } from '@src/services/settings';
import { editor } from '@src/services/project';
import { useAppSelectors } from '@store/hooks';
import { ai } from '@src/services/ai';
import { useMemo } from 'react';

/** The per-line state a row is rendered from: exactly the data props the Editor page passes to
 * EditorTableLine. Built once per row there, then both spread into the row and fingerprinted
 * here, so the render cache's key can't disagree with what the row actually shows. */
export type TLineRowState = {
  lineIndex: number;
  lineNo: number;
  sourceText: string;
  translatedText: string;
  startTime: number;
  endTime: number;
  character: string;
  isCompleted: boolean;
  isFocused: boolean;
  isActive: boolean;
  isMergeCandidate: boolean;
  isMergeMaster: boolean;
  isFrozen: boolean;
};

// Fixed order, so equal states always produce equal keys
const ROW_STATE_KEYS: readonly (keyof TLineRowState)[] = [
  'lineIndex',
  'lineNo',
  'sourceText',
  'translatedText',
  'startTime',
  'endTime',
  'character',
  'isCompleted',
  'isFocused',
  'isActive',
  'isMergeCandidate',
  'isMergeMaster',
  'isFrozen',
];

const serialize = (value: string | number | boolean) =>
  typeof value === 'boolean' ? (value ? 1 : 0) : value;

/** The render cache key of a row: its row state (see TLineRowState) plus what the row also depends
 * on without receiving it as a data prop -- the character pool, AI availability, the editor mode,
 * whether the line runs past the video, and the modifier keys held while it's focused. */
export function useLineFingerprint() {
  const { isCtrlPressed, isAltPressed, isCtrlAltPressed, isAltShiftPressed } = useEditorKeystroke();

  const [
    integrationIsConfigured,
    translationIsBusy,
    characterOptions,
    editorMode,
    videoDurationMs,
  ] = useAppSelectors(
    settings.selectIntegrationIsConfigured,
    ai.selectIsBusy,
    editor.selectCharacterPool,
    editor.selectMode,
    media.selectVideoDurationMs
  );

  const characterOptionsHash = useMemo(
    () => characterOptions.map((item) => `${item.name}:${item.color}`).join('|'),
    [characterOptions]
  );

  const getLineFingerprint = (row: TLineRowState): string => {
    const ctrlMask = row.isFocused
      ? (isCtrlPressed ? 1 : 0) +
        (isAltShiftPressed ? 2 : 0) +
        (isCtrlAltPressed ? 4 : 0) +
        (isAltPressed ? 8 : 0)
      : 0;
    const isBeyondVideo =
      videoDurationMs != null && (row.startTime > videoDurationMs || row.endTime > videoDurationMs);
    return [
      ...ROW_STATE_KEYS.map((key) => serialize(row[key])),
      characterOptionsHash,
      serialize(integrationIsConfigured && !translationIsBusy),
      serialize(isBeyondVideo),
      ctrlMask,
      editorMode,
    ].join('::');
  };

  return { getLineFingerprint };
}

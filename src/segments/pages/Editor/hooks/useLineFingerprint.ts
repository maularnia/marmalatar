import { media } from '@src/services/media';
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
  'isFrozen',
];

const serialize = (value: string | number | boolean) =>
  typeof value === 'boolean' ? (value ? 1 : 0) : value;

/** The render cache key of a row: its row state (see TLineRowState) plus what the row also depends
 * on without receiving it as a data prop -- the character pool, AI availability, the editor mode,
 * and whether the line runs past the video. Focus, playback and merge candidates aren't part of it:
 * they're drawn by shared backdrops under the rows, so rows never re-render for them. */
export function useLineFingerprint() {
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
    const isBeyondVideo =
      videoDurationMs != null && (row.startTime > videoDurationMs || row.endTime > videoDurationMs);
    return [
      ...ROW_STATE_KEYS.map((key) => serialize(row[key])),
      characterOptionsHash,
      serialize(integrationIsConfigured && !translationIsBusy),
      serialize(isBeyondVideo),
      editorMode,
    ].join('::');
  };

  return { getLineFingerprint };
}

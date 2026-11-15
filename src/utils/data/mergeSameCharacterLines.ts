import type { TSubtitleLine } from '@src/types';
import { parseCharacterList } from '@utils/characters';

// The same set of characters, whatever order they were listed in; null for a line without any
const getCharacterKey = (line: TSubtitleLine): string | null => {
  const characters = parseCharacterList(line.character);
  return characters.length ? [...characters].sort().join(',') : null;
};

const joinTexts = (texts: (string | undefined)[]): string =>
  texts
    .map((text) => text ?? '')
    .join(' ')
    .trim()
    .replace(/\s+/g, ' ');

/** Merges runs of consecutive lines (by line number) spoken by the same characters into single
 * lines, as long as each gap between them is at most `thresholdMs`. A merged line spans the run's
 * time, joins its texts with spaces and counts as completed if any part was. Lines without a
 * character are never merged. The result is renumbered from 1. */
export function mergeSameCharacterLines(
  lines: readonly TSubtitleLine[],
  thresholdMs: number
): TSubtitleLine[] {
  const sorted = [...lines].sort((a, b) => a.line_no - b.line_no);
  const merged: TSubtitleLine[] = [];

  let i = 0;
  while (i < sorted.length) {
    const group = [sorted[i]];
    const characterKey = getCharacterKey(sorted[i]);
    if (characterKey) {
      while (i + group.length < sorted.length) {
        const next = sorted[i + group.length];
        const gap = next.start_time - group[group.length - 1].end_time;
        if (getCharacterKey(next) !== characterKey || gap > thresholdMs) break;
        group.push(next);
      }
    }

    merged.push(
      group.length === 1
        ? group[0]
        : {
            ...group[0],
            start_time: Math.min(...group.map((line) => line.start_time)),
            end_time: Math.max(...group.map((line) => line.end_time)),
            input: joinTexts(group.map((line) => line.input)),
            output: joinTexts(group.map((line) => line.output)),
            completed: group.some((line) => Boolean(line.completed)),
          }
    );
    i += group.length;
  }

  return merged.map((line, index) => ({ ...line, line_no: index + 1 }));
}

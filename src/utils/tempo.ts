import type { TProjectTempo } from '@bridge/definitions/projectEntry';

/** Whether one subtitle entry keeps within the project's limits: on screen for at least
 * `minDurationMs`, at most `maxLinesPerEntry` lines, none longer than `maxCharsPerLine`.
 * Characters are counted as the viewer sees them, spaces and punctuation included (the delivery
 * specs count them too); only the entry's outer whitespace is ignored. Empty text passes the text
 * rules -- an untranslated line isn't "too long" -- but the duration rule still applies. */
export function passesTempo(
  text: string,
  startMs: number,
  endMs: number,
  tempo: TProjectTempo
): boolean {
  if (endMs - startMs < tempo.minDurationMs) return false;
  const trimmed = text.trim();
  if (!trimmed) return true;
  const lines = trimmed.split('\n');
  return (
    lines.length <= tempo.maxLinesPerEntry &&
    lines.every((line) => line.length <= tempo.maxCharsPerLine)
  );
}

import type { TProjectTempo } from '@bridge/definitions/projectEntry';
import type { TSubtitleLine } from '@src/types';

// A project has no frame rate of its own; for a "2 frames between entries" rule the film standard
// is close enough to every common rate (24, 25: a frame is 40–42 ms either way)
const SUBTITLE_FRAME_RATE = 23.976;
const FRAME_MS = 1000 / SUBTITLE_FRAME_RATE;

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

/** The rules between entries, one flag per line index (true: the line breaks one).
 * - Interval: consecutive entries (list order) closer than `minIntervalFrames` -- both are
 *   flagged. Only a gap of zero or more counts: a negative gap is an overlap, left to the rule
 *   below, so switching overlap highlighting off really stops overlapping lines from being marked
 * - Overlap (while `highlightOverlaps`): any two entries whose spans intersect, neighbours in the
 *   list or not -- both are flagged. Sorted by start and swept with the running latest end, so a
 *   long entry covering several later ones catches each of them */
export function findTimingIssues(lines: readonly TSubtitleLine[], tempo: TProjectTempo): boolean[] {
  const flags = lines.map(() => false);

  const minGapMs = tempo.minIntervalFrames * FRAME_MS;
  for (let i = 1; i < lines.length; i++) {
    const gap = lines[i].start_time - lines[i - 1].end_time;
    if (gap >= 0 && gap < minGapMs) {
      flags[i - 1] = true;
      flags[i] = true;
    }
  }

  if (tempo.highlightOverlaps) {
    const byStart = lines
      .map((_, index) => index)
      .sort((a, b) => lines[a].start_time - lines[b].start_time);
    let latestEndIndex = -1;
    for (const index of byStart) {
      const line = lines[index];
      if (latestEndIndex >= 0 && line.start_time < lines[latestEndIndex].end_time) {
        flags[index] = true;
        flags[latestEndIndex] = true;
      }
      if (latestEndIndex < 0 || line.end_time > lines[latestEndIndex].end_time) {
        latestEndIndex = index;
      }
    }
  }

  return flags;
}

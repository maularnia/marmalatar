import type { TProjectTempo } from '@bridge/definitions/projectEntry';
import type { TSubtitleLine } from '@src/types';

// A project has no frame rate of its own; for a "2 frames between entries" rule the film standard
// is close enough to every common rate (24, 25: a frame is 40–42 ms either way)
const SUBTITLE_FRAME_RATE = 23.976;
const FRAME_MS = 1000 / SUBTITLE_FRAME_RATE;

type TTempoRule = { value: number; limit: number; ok: boolean };

type TTempoStats = {
  lines: TTempoRule;
  durationMs: TTempoRule;
  charsPerSecond: TTempoRule;
};

type TTempoNeighbourStats = {
  tooCloseToPrevious: boolean;
  tooCloseToNext: boolean;
};

/** Characters as the viewer reads them: spaces and punctuation included (the delivery specs count
 * them too), line breaks and the entry's outer whitespace not */
function countVisibleChars(text: string): number {
  return text.trim().replace(/\r?\n/g, '').length;
}

/** One subtitle entry against the project's own limits: at most `maxLinesPerEntry` lines, on screen
 * for at least `minDurationMs`, read at no more than `maxCharsPerSecond` (Netflix's reading speed:
 * visible characters / seconds on screen). Empty text passes the text rules -- an untranslated line
 * isn't "too fast" -- but the duration rule still applies. */
export function getTempoStats(
  text: string,
  startMs: number,
  endMs: number,
  tempo: TProjectTempo
): TTempoStats {
  const trimmed = text.trim();
  const lineCount = trimmed ? trimmed.split('\n').length : 0;
  const durationMs = endMs - startMs;
  const chars = countVisibleChars(trimmed);
  // A non-positive duration can't be read at any speed; Infinity keeps it failing (and shows as ∞)
  const charsPerSecond = chars === 0 ? 0 : durationMs > 0 ? chars / (durationMs / 1000) : Infinity;
  return {
    lines: {
      value: lineCount,
      limit: tempo.maxLinesPerEntry,
      ok: lineCount <= tempo.maxLinesPerEntry,
    },
    durationMs: {
      value: durationMs,
      limit: tempo.minDurationMs,
      ok: durationMs >= tempo.minDurationMs,
    },
    charsPerSecond: {
      value: charsPerSecond,
      limit: tempo.maxCharsPerSecond,
      ok: charsPerSecond <= tempo.maxCharsPerSecond,
    },
  };
}

/** Whether one subtitle entry keeps within the project's limits (see `getTempoStats`) */
export function passesTempo(
  text: string,
  startMs: number,
  endMs: number,
  tempo: TProjectTempo
): boolean {
  const { lines, durationMs, charsPerSecond } = getTempoStats(text, startMs, endMs, tempo);
  return lines.ok && durationMs.ok && charsPerSecond.ok;
}

// The same gap test `findTimingIssues` applies between consecutive entries: closer than
// `minIntervalFrames`, or overlapping while overlaps are highlighted
function isGapTooSmall(gapMs: number, tempo: TProjectTempo): boolean {
  if (gapMs < 0) return tempo.highlightOverlaps;
  return gapMs < tempo.minIntervalFrames * FRAME_MS;
}

/** Which list neighbours of `lines[index]` it sits too close to (or overlaps) */
export function getTempoNeighbourStats(
  lines: readonly TSubtitleLine[],
  index: number,
  tempo: TProjectTempo
): TTempoNeighbourStats {
  const line = lines[index];
  const previous = lines[index - 1];
  const next = lines[index + 1];
  return {
    tooCloseToPrevious:
      !!line && !!previous && isGapTooSmall(line.start_time - previous.end_time, tempo),
    tooCloseToNext: !!line && !!next && isGapTooSmall(next.start_time - line.end_time, tempo),
  };
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

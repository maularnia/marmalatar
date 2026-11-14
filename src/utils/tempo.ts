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
  return gapMs < getMinGapMs(tempo);
}

// The gap the interval rule requires between consecutive entries
export function getMinGapMs(tempo: TProjectTempo): number {
  return tempo.minIntervalFrames * FRAME_MS;
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

  const minGapMs = getMinGapMs(tempo);
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

/** Moves line timings to satisfy the rules between consecutive entries (list order), as far as
 * that's possible without reshaping a line. Each pair is taken with the timings already adjusted
 * for the pair before it, so a fix carries over:
 * - Skipped when either line has no text (`getText`: the column the current mode works on) -- an
 *   untranslated line isn't worth retiming yet
 * - Skipped when one line lies entirely within the other: there's no single cut that separates them
 * - A partial overlap (the next line starts inside the previous one) is cut at the middle of the
 *   intersection: the previous line ends and the next starts there
 * - A gap below `minIntervalFrames` (a cut overlap leaves a gap of zero) is widened symmetrically
 *   from its middle to the minimum, rounded outward to whole milliseconds -- unless that would
 *   leave either line with no duration, in which case the gap is left as it is
 * With `extendForCps`, a last pass then lengthens lines read faster than `maxCharsPerSecond`: the
 * start stays, the end moves later until the reading speed fits -- or, when that would come closer
 * to the next line than `minIntervalFrames` (or past `maxEndMs`, the video's end), as far as there
 * is room. A line already touching that limit stays as it is.
 * Returns new line objects only for the lines that changed, and how many did. */
export function autoFixTiming(
  lines: readonly TSubtitleLine[],
  tempo: TProjectTempo,
  getText: (line: TSubtitleLine) => string,
  options: { extendForCps?: boolean; maxEndMs?: number | null } = {}
): { lines: TSubtitleLine[]; changedCount: number } {
  const minGapMs = getMinGapMs(tempo);
  const result = [...lines];
  const changed = new Set<number>();

  const update = (
    index: number,
    timing: Partial<Pick<TSubtitleLine, 'start_time' | 'end_time'>>
  ) => {
    result[index] = { ...result[index], ...timing };
    changed.add(index);
  };

  for (let i = 1; i < result.length; i++) {
    const prev = result[i - 1];
    const next = result[i];
    if (!getText(prev).trim() || !getText(next).trim()) continue;

    const nextInsidePrev = next.start_time >= prev.start_time && next.end_time <= prev.end_time;
    const prevInsideNext = prev.start_time >= next.start_time && prev.end_time <= next.end_time;
    if (nextInsidePrev || prevInsideNext) continue;

    let prevEnd = prev.end_time;
    let nextStart = next.start_time;
    if (nextStart < prevEnd) {
      const middle = (nextStart + prevEnd) / 2;
      prevEnd = middle;
      nextStart = middle;
    }

    if (nextStart - prevEnd < minGapMs) {
      const middle = (nextStart + prevEnd) / 2;
      const widenedEnd = Math.floor(middle - minGapMs / 2);
      const widenedStart = Math.ceil(middle + minGapMs / 2);
      if (widenedEnd > prev.start_time && widenedStart < next.end_time) {
        prevEnd = widenedEnd;
        nextStart = widenedStart;
      }
    }

    // A cut overlap whose widening was skipped still has to land on whole milliseconds
    prevEnd = Math.round(prevEnd);
    nextStart = Math.max(Math.round(nextStart), prevEnd);
    if (prevEnd !== prev.end_time) update(i - 1, { end_time: prevEnd });
    if (nextStart !== next.start_time) update(i, { start_time: nextStart });
  }

  // Last, so the room each line has is measured against neighbours already retimed above
  if (options.extendForCps) {
    for (let i = 0; i < result.length; i++) {
      const line = result[i];
      const chars = countVisibleChars(getText(line));
      if (!chars) continue;
      const requiredMs = Math.ceil((chars * 1000) / tempo.maxCharsPerSecond);
      if (line.end_time - line.start_time >= requiredMs) continue;

      const next = result[i + 1];
      const roomEnd = next
        ? Math.floor(next.start_time - minGapMs)
        : (options.maxEndMs ?? Number.POSITIVE_INFINITY);
      const end = Math.min(line.start_time + requiredMs, roomEnd);
      if (end > line.end_time) update(i, { end_time: end });
    }
  }

  return { lines: result, changedCount: changed.size };
}

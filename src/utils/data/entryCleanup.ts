import { normalizeText } from '@src/utils/string';

const LONG_DASH = '—';

const hasVisibleWordContent = (text: string): boolean => /[\p{L}\p{N}]/u.test(text);

/** Replaces `<br/>` (and variants) with a newline, then strips any remaining HTML tags. */
function cleanHtmlTags(text: string): string {
  return text.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ' ');
}

/** Strips ASS override blocks, e.g. `{\an8\fad(200,200)}`. */
function cleanAssStyling(text: string): string {
  return text.replace(/\{[^}]*}/g, ' ');
}

/** Strips audio-cue annotations, e.g. `[music]`, `[sigh]`. */
function cleanAudioCues(text: string): string {
  return text.replace(/\[[^\]]*]/g, ' ');
}

/**
 * Replaces short dashes with a long dash (—) where they're standing in for one: at the start of a
 * line (the subtitle convention marking a new speaker's line), or "intermediate" -- surrounded by
 * spaces, or trailing at the end of a line. A dash with no surrounding space (e.g. inside
 * "well-known") is left alone.
 *
 * A leading dash only means "new speaker" when there's more than one line to speak it against --
 * on a single-line entry it's just noise (e.g. a leftover list marker), so it's dropped entirely
 * rather than promoted to a long dash.
 */
function fixShortDashes(text: string): string {
  const lines = text.split('\n');
  const isSingleLine = lines.length === 1;
  return lines
    .map((line) => {
      const withStartDashFixed = isSingleLine
        ? line.replace(/^(\s*)-(\s*)/, '$1$2')
        : line.replace(/^(\s*)-(\s*)/, `$1${LONG_DASH}$2`);
      return withStartDashFixed.replace(/( )-(?=( |$))/g, `$1${LONG_DASH}`);
    })
    .join('\n');
}

export type TEntryCleanupOptions = {
  cleanHtmlTags?: boolean;
  cleanAssStyling?: boolean;
  cleanAudioCues?: boolean;
  fixShortDashes?: boolean;
};

/** Runs the enabled cleanups, in this fixed order, against a single block of text. */
function cleanupText(text: string, options: TEntryCleanupOptions): string {
  let result = text;
  if (options.cleanHtmlTags) result = cleanHtmlTags(result);
  if (options.cleanAssStyling) result = cleanAssStyling(result);
  if (options.cleanAudioCues) result = cleanAudioCues(result);
  if (options.fixShortDashes) result = fixShortDashes(result);
  return normalizeText(result);
}

/** Postcheck step 2: drops lines within an entry's text that carry no visible word content. */
function dropBlankLinesWithinEntry(text: string): string {
  return text.split('\n').filter(hasVisibleWordContent).join('\n');
}

/**
 * Runs the full cleanup + postcheck pipeline against an arbitrary array of entries. Generic over
 * the entry shape via `getText`/`setText` so this has no dependency on any particular project
 * structure or translation-line format (e.g. `TSubtitleLine`) -- callers adapt their own entry
 * type through the accessors, so this stays reusable for whatever "array of entries" shows up next.
 *
 * Order: cleanupText (html -> ASS styling -> audio cues -> short dashes, per the enabled options),
 * then postcheck (drop blank-only lines within each entry, then drop entries left with no visible
 * word content at all).
 */
export function cleanupEntries<T>(
  entries: T[],
  options: TEntryCleanupOptions,
  getText: (entry: T) => string,
  setText: (entry: T, text: string) => T
): T[] {
  return entries
    .map((entry) => setText(entry, dropBlankLinesWithinEntry(cleanupText(getText(entry), options))))
    .filter((entry) => hasVisibleWordContent(getText(entry)));
}

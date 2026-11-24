export type TTextRange = { start: number; end: number };

const NO_MATCHES: TTextRange[] = [];

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Every occurrence of `query` in `text`, ignoring case, as offsets into `text`. Matched with a
 * RegExp rather than by lowercasing both strings: lowercasing can change a string's length (İ), and
 * the offsets would then point at the wrong characters of the original text. */
export function findMatches(text: string, query: string): TTextRange[] {
  if (!query || !text) return NO_MATCHES;
  const pattern = new RegExp(escapeRegExp(query), 'giu');
  const matches: TTextRange[] = [];
  for (const match of text.matchAll(pattern)) {
    matches.push({ start: match.index, end: match.index + match[0].length });
  }
  return matches;
}

/** `text` with every occurrence of `query` (ignoring case) replaced by `replacement`, taken
 * literally -- `$` patterns in it mean nothing. */
export function replaceMatches(text: string, query: string, replacement: string): string {
  if (!query || !text) return text;
  return text.replace(new RegExp(escapeRegExp(query), 'giu'), () => replacement);
}

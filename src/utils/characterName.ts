// What a typed character name may contain: Latin and Cyrillic letters (extended ones included),
// digits, the apostrophe (ASCII and the typographic one Belarusian text uses) and the hyphen.
// The letter lookahead keeps symbols that merely belong to those scripts out. Anything else --
// commas (the list separator), punctuation, emoji -- is dropped as it's typed. Spaces and the slash
// (which splits a character in two, see splitCharacterName) only where asked: the line selector
// takes neither, it only matches names from the start.
const ALLOWED_NAME_CHAR = /^(?:(?=\p{L})[\p{Script=Latin}\p{Script=Cyrillic}]|[0-9'’-])$/u;

/** The text with every character a name may not contain removed. Composed first (NFC), so a
 * letter typed as base + combining mark (й, ł) survives as one letter. */
export function sanitizeCharacterName(
  text: string,
  { allowSpaces = false, allowSlash = false } = {}
): string {
  return Array.from(text.normalize('NFC'))
    .filter(
      (char) =>
        ALLOWED_NAME_CHAR.test(char) ||
        (allowSpaces && char === ' ') ||
        (allowSlash && char === '/')
    )
    .join('');
}

/** The names a typed text stands for: it's cut at every slash, each part normalized, empty parts
 * and repeats dropped. One name for plain text. */
export function splitCharacterName(text: string): string[] {
  return [...new Set(text.split('/').map(normalizeCharacterName).filter(Boolean))];
}

/** A name as it's stored: runs of spaces collapsed to one, none at either end */
export function normalizeCharacterName(text: string): string {
  return text.replace(/ {2,}/g, ' ').trim();
}

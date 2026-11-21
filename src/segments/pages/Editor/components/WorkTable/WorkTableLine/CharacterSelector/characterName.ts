// What a typed character name may contain: Latin and Cyrillic letters (extended ones included),
// digits, the apostrophe (ASCII and the typographic one Belarusian text uses) and the hyphen.
// The letter lookahead keeps symbols that merely belong to those scripts out. Anything else --
// spaces, commas (the list separator), punctuation, emoji -- is dropped as it's typed.
const ALLOWED_NAME_CHAR = /^(?:(?=\p{L})[\p{Script=Latin}\p{Script=Cyrillic}]|[0-9'’-])$/u;

/** The text with every character a name may not contain removed. Composed first (NFC), so a
 * letter typed as base + combining mark (й, ł) survives as one letter. */
export function sanitizeCharacterName(text: string): string {
  return Array.from(text.normalize('NFC'))
    .filter((char) => ALLOWED_NAME_CHAR.test(char))
    .join('');
}

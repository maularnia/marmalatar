/** Cuts the text to `maxLength` characters, adding "..." when anything was cut. Counts code points,
 * not UTF-16 units, so a character outside the BMP (an emoji) is never split in half. */
export function truncateText(text: string, maxLength: number): string {
  const chars = Array.from(text);
  return chars.length > maxLength ? `${chars.slice(0, maxLength).join('')}...` : text;
}

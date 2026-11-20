export const FALLBACK_EMOJI = '🙂';

// The picker's own English dataset (bundled, no network). Category keys as the dataset names them.
const CREATION_EMOJI_CATEGORIES = ['animals_nature', 'food_drink'];
// Newer emoji may have no glyph in the app's emoji font (Twemoji Mozilla) yet
const MAX_CREATION_EMOJI_VERSION = 14;

// A dataset entry's unified code ('1f408-200d-2b1b') is its code points in hex
function unifiedToEmoji(unified: string): string {
  return String.fromCodePoint(...unified.split('-').map((hex) => parseInt(hex, 16)));
}

/** A random animal or food emoji for a new project, prompt template or glossary. Async because the
 * dataset is loaded on demand. */
export async function pickRandomCreationEmoji(): Promise<string> {
  const { default: data } = await import('emoji-picker-react/data/emojis-en');
  const pool = CREATION_EMOJI_CATEGORIES.flatMap((category) => data.emojis[category] ?? []).filter(
    (emoji) => Number(emoji.a) <= MAX_CREATION_EMOJI_VERSION
  );
  if (!pool.length) return FALLBACK_EMOJI;
  return unifiedToEmoji(pool[Math.floor(Math.random() * pool.length)].u);
}

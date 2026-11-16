import { Database } from 'emoji-picker-element';
import emojiDataUrl from 'emoji-picker-element-data/en/emojibase/data.json?url';

// The emoji set ships with the app instead of the library's default jsDelivr URL, so the picker
// works offline and makes no network calls. Every Picker and Database must use this same source:
// the library keys its IndexedDB cache on the data source URL.
export const EMOJI_DATA_SOURCE = emojiDataUrl;
export const EMOJI_LOCALE = 'en';

const ANIMALS_NATURE_GROUP = 3;
const FOOD_DRINK_GROUP = 4;
export const FALLBACK_EMOJI = '🙂';

export async function pickRandomCreationEmoji(): Promise<string> {
  const db = new Database({ locale: EMOJI_LOCALE, dataSource: EMOJI_DATA_SOURCE });
  try {
    const [animals, food] = await Promise.all([
      db.getEmojiByGroup(ANIMALS_NATURE_GROUP),
      db.getEmojiByGroup(FOOD_DRINK_GROUP),
    ]);
    const pool = [...animals, ...food];
    return pool.length ? pool[Math.floor(Math.random() * pool.length)].unicode : FALLBACK_EMOJI;
  } finally {
    await db.close();
  }
}

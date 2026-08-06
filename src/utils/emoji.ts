import { Database } from 'emoji-picker-element';

const ANIMALS_NATURE_GROUP = 3;
const FOOD_DRINK_GROUP = 4;
export const FALLBACK_EMOJI = '🙂';

export async function pickRandomCreationEmoji(): Promise<string> {
  const db = new Database({ locale: 'en' });
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

import { TCharacter } from '@src/types';

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The pool characters whose name starts with `query` (case-insensitive) and isn't in `exclude`,
 * most relevant first: the fewer symbols a name has left outside the query, the higher it ranks.
 * Equal ones keep their pool order (the sort is stable). An empty query matches nothing. */
export function rankCharacters(
  pool: readonly TCharacter[],
  query: string,
  exclude: readonly string[]
): TCharacter[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const startsWithQuery = new RegExp(`^${escapeRegExp(trimmed)}`, 'iu');
  return pool
    .filter(({ name }) => !exclude.includes(name) && startsWithQuery.test(name))
    .map((character) => ({ character, score: trimmed.length - character.name.length }))
    .sort((a, b) => b.score - a.score)
    .map(({ character }) => character);
}

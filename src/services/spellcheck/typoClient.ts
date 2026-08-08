import Typo from 'typo-js';
import { TLanguage } from '@src/types';
import i18n from '@src/i18n';
import type { SpellCheckMark } from '@ui-toolkit/Mark';
import { DICTIONARIES } from './dictionaries';

const t = i18n.getFixedT(null, 'errors');

async function fetchDictionaryText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(t('spellcheck.dictionaryLoadFailed', { url }));
  return response.text();
}

type LoadedDictionary = { typo: Typo; locale: string };

// The parsed dictionary is an expensive, read-only resource, so it's loaded once and shared --
// every editor checking the same language reuses the same parsed dictionary instead of
// re-fetching/re-parsing a multi-megabyte word list. This cache carries no per-request state, so
// it has nothing to do with how individual editors issue/cancel their own checks (see
// `createSpellCheckClient` below) -- a single shared *request* coordinator wouldn't fit this use
// case, since every editor needs to issue and cancel checks independently.
const typoPromises = new Map<TLanguage, Promise<LoadedDictionary>>();

function getTypo(language: TLanguage): Promise<LoadedDictionary> {
  const cached = typoPromises.get(language);
  if (cached) return cached;

  const dictionary = DICTIONARIES[language];
  const promise = (async (): Promise<LoadedDictionary> => {
    const [affData, wordsData] = await Promise.all([
      fetchDictionaryText(dictionary.affUrl),
      fetchDictionaryText(dictionary.dicUrl),
    ]);
    return { typo: new Typo(dictionary.locale, affData, wordsData), locale: dictionary.locale };
  })();

  typoPromises.set(language, promise);
  return promise;
}

function checkText(typo: Typo, locale: string, text: string): SpellCheckMark[] {
  const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
  const marks: SpellCheckMark[] = [];
  for (const { segment, index, isWordLike } of segmenter.segment(text)) {
    if (!isWordLike || !segment.trim()) continue;
    if (typo.check(segment)) continue;
    marks.push({
      id: `${index}-${index + segment.length}`,
      start: index,
      end: index + segment.length,
      word: segment,
      suggestions: typo.suggest(segment),
    });
  }
  return marks;
}

export type SpellCheckClient = {
  /** Requests a check for `text`. Resolves to `null` if a newer `request()`/`cancel()` call on
   * this same client superseded it before the dictionary lookup finished -- callers should treat
   * a `null` result as "discard, do nothing" rather than apply stale marks. */
  request: (text: string) => Promise<SpellCheckMark[] | null>;
  /** Cancels whichever request is currently in flight on this client, if any. */
  cancel: () => void;
};

/**
 * Creates a request client dedicated to a single editor. Each editor owns its own client (and
 * therefore its own cancellation token) -- only the dictionary data above is shared.
 */
export function createSpellCheckClient(language: TLanguage): SpellCheckClient {
  let currentToken = 0;

  return {
    async request(text: string): Promise<SpellCheckMark[] | null> {
      const token = ++currentToken;
      const { typo, locale } = await getTypo(language);
      if (token !== currentToken) return null;
      return checkText(typo, locale, text);
    },
    cancel(): void {
      currentToken += 1;
    },
  };
}

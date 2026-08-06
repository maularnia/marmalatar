import { loadModule, type Hunspell, type HunspellFactory } from 'hunspell-asm';
import { TLanguage } from '@src/types';
import i18n from '@src/i18n';
import type { SpellCheckMark } from '@ui-toolkit/Mark';
import { DICTIONARIES } from './dictionaries';

const t = i18n.getFixedT(null, 'errors');

// The wasm runtime and per-language dictionaries are expensive, read-only resources, so they're
// loaded once and shared -- every editor checking the same language reuses the same loaded
// dictionary instead of re-fetching/re-parsing a multi-megabyte word list. This cache carries no
// per-request state, so it has nothing to do with how individual editors issue/cancel their own
// checks (see `createSpellCheckClient` below) -- a single shared *request* coordinator wouldn't
// fit this use case, since every editor needs to issue and cancel checks independently.
let factoryPromise: Promise<HunspellFactory> | null = null;
function getFactory(): Promise<HunspellFactory> {
  if (!factoryPromise) factoryPromise = loadModule();
  return factoryPromise;
}

async function fetchDictionaryBuffer(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(t('spellcheck.dictionaryLoadFailed', { url }));
  return new Uint8Array(await response.arrayBuffer());
}

type LoadedDictionary = { hunspell: Hunspell; locale: string };

const hunspellPromises = new Map<TLanguage, Promise<LoadedDictionary>>();

function getHunspell(language: TLanguage): Promise<LoadedDictionary> {
  const cached = hunspellPromises.get(language);
  if (cached) return cached;

  const dictionary = DICTIONARIES[language];
  const promise = (async (): Promise<LoadedDictionary> => {
    const [factory, affBuffer, dicBuffer] = await Promise.all([
      getFactory(),
      fetchDictionaryBuffer(dictionary.affUrl),
      fetchDictionaryBuffer(dictionary.dicUrl),
    ]);
    const affPath = factory.mountBuffer(affBuffer, `${dictionary.locale}.aff`);
    const dicPath = factory.mountBuffer(dicBuffer, `${dictionary.locale}.dic`);
    return { hunspell: factory.create(affPath, dicPath), locale: dictionary.locale };
  })();

  hunspellPromises.set(language, promise);
  return promise;
}

function checkText(hunspell: Hunspell, locale: string, text: string): SpellCheckMark[] {
  const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
  const marks: SpellCheckMark[] = [];
  for (const { segment, index, isWordLike } of segmenter.segment(text)) {
    if (!isWordLike || !segment.trim()) continue;
    if (hunspell.spell(segment)) continue;
    marks.push({
      id: `${index}-${index + segment.length}`,
      start: index,
      end: index + segment.length,
      word: segment,
      suggestions: hunspell.suggest(segment),
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
      const { hunspell, locale } = await getHunspell(language);
      if (token !== currentToken) return null;
      return checkText(hunspell, locale, text);
    },
    cancel(): void {
      currentToken += 1;
    },
  };
}

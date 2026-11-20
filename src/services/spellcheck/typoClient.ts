import { TLanguage } from '@src/types';
import i18n from '@src/i18n';
import type { SpellCheckMark } from '@ui-toolkit/Mark';
import { DICTIONARIES } from './dictionaries';
import type {
  TSpellcheckJob,
  TSpellcheckResult,
  TSpellcheckWorkerResponse,
} from './spellcheckWorkerTypes';

const t = i18n.getFixedT(null, 'errors');

async function fetchDictionaryText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(t('spellcheck.dictionaryLoadFailed', { url }));
  return response.text();
}

type TPendingJob = {
  resolve: (result: TSpellcheckResult) => void;
  reject: (error: Error) => void;
};

// Dictionary parsing and suggestions take seconds of synchronous work (over 2s for one Belarusian
// word), so they run on this one shared worker to keep the UI thread free.
let worker: Worker | null = null;
const pendingJobs = new Map<number, TPendingJob>();
let nextJobId = 0;

// The parsed dictionary is an expensive, read-only resource, so it's loaded once and shared --
// every editor checking the same language reuses the same parsed dictionary instead of
// re-fetching/re-parsing a multi-megabyte word list. This cache carries no per-request state, so
// it has nothing to do with how individual editors issue/cancel their own checks (see
// `createSpellCheckClient` below) -- a single shared *request* coordinator wouldn't fit this use
// case, since every editor needs to issue and cancel checks independently.
const dictionaryLoads = new Map<TLanguage, Promise<void>>();

// Rejects whatever was waiting on the dead worker. The next request starts a new one, which has no
// dictionaries, so those are forgotten too.
function handleWorkerFailure(message: string): void {
  worker?.terminate();
  worker = null;
  dictionaryLoads.clear();
  const jobs = [...pendingJobs.values()];
  pendingJobs.clear();
  jobs.forEach((job) => job.reject(new Error(message)));
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./spellcheck.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }: MessageEvent<TSpellcheckWorkerResponse>) => {
    const job = pendingJobs.get(data.id);
    if (!job) return;
    pendingJobs.delete(data.id);
    if ('error' in data) job.reject(new Error(data.error));
    else job.resolve(data.result);
  };
  worker.onerror = (event) => handleWorkerFailure(event.message || t('spellcheck.workerFailed'));
  return worker;
}

function startJob(job: TSpellcheckJob): { id: number; result: Promise<TSpellcheckResult> } {
  const id = ++nextJobId;
  const result = new Promise<TSpellcheckResult>((resolve, reject) => {
    pendingJobs.set(id, { resolve, reject });
  });
  getWorker().postMessage({ ...job, id });
  return { id, result };
}

function ensureDictionary(language: TLanguage): Promise<void> {
  const cached = dictionaryLoads.get(language);
  if (cached) return cached;

  const { locale, affUrl, dicUrl } = DICTIONARIES[language];
  const load = (async () => {
    const [affData, wordsData] = await Promise.all([
      fetchDictionaryText(affUrl),
      fetchDictionaryText(dicUrl),
    ]);
    await startJob({ type: 'load', language, locale, affData, wordsData }).result;
  })();

  dictionaryLoads.set(language, load);
  load.catch(() => {
    if (dictionaryLoads.get(language) === load) dictionaryLoads.delete(language);
  });
  return load;
}

export type SpellCheckClient = {
  /** Requests a check for `text`, skipping `ignoredWords` (lowercased, from the user
   * dictionaries). Resolves to `null` if a newer `request()`/`cancel()` call on this same client
   * superseded it before the dictionary lookup finished -- callers should treat a `null` result as
   * "discard, do nothing" rather than apply stale marks. */
  request: (text: string, ignoredWords: readonly string[]) => Promise<SpellCheckMark[] | null>;
  /** Requests suggestions for one misspelled word. These take seconds, so they're only computed
   * for words the user actually looks at. Resolves to `null` if a newer `suggest()`/`cancel()`
   * call on this same client superseded it. */
  suggest: (word: string) => Promise<string[] | null>;
  /** Cancels whatever is currently in flight on this client, if anything. */
  cancel: () => void;
};

/**
 * Creates a request client dedicated to a single editor. Each editor owns its own client (and
 * therefore its own cancellation tokens) -- only the worker and dictionary data above are shared.
 */
export function createSpellCheckClient(language: TLanguage): SpellCheckClient {
  let checkToken = 0;
  let suggestToken = 0;
  let activeCheckId: number | null = null;
  let activeSuggestId: number | null = null;

  const cancelJob = (id: number | null) => {
    if (id !== null) worker?.postMessage({ type: 'cancel', id });
  };

  return {
    async request(text: string, ignoredWords: readonly string[]): Promise<SpellCheckMark[] | null> {
      const token = ++checkToken;
      cancelJob(activeCheckId);
      await ensureDictionary(language);
      if (token !== checkToken) return null;

      const { id, result } = startJob({
        type: 'check',
        language,
        text,
        ignored: [...ignoredWords],
      });
      activeCheckId = id;
      const marks = (await result) as SpellCheckMark[] | null;
      return token === checkToken ? marks : null;
    },
    async suggest(word: string): Promise<string[] | null> {
      const token = ++suggestToken;
      cancelJob(activeSuggestId);
      await ensureDictionary(language);
      if (token !== suggestToken) return null;

      const { id, result } = startJob({ type: 'suggest', language, word });
      activeSuggestId = id;
      const suggestions = (await result) as string[] | null;
      return token === suggestToken ? suggestions : null;
    },
    cancel(): void {
      checkToken += 1;
      suggestToken += 1;
      cancelJob(activeCheckId);
      cancelJob(activeSuggestId);
    },
  };
}

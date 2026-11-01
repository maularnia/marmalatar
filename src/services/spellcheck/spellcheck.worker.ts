import type { TLanguage } from '@src/types';
import type { SpellCheckMark } from '@ui-toolkit/Mark';
import Typo from 'typo-js';
import type {
  TSpellcheckJob,
  TSpellcheckResult,
  TSpellcheckWorkerRequest,
  TSpellcheckWorkerResponse,
} from './spellcheckWorkerTypes';

// tsconfig targets the DOM lib, where `self` is a Window with a different postMessage signature.
const workerScope = self as unknown as Worker;

type TLoadedDictionary = { typo: Typo; locale: string };
type TQueuedJob = TSpellcheckJob & { id: number };

const dictionaries = new Map<TLanguage, TLoadedDictionary>();
const queue: TQueuedJob[] = [];
let isScheduled = false;

function checkText({ typo, locale }: TLoadedDictionary, text: string): SpellCheckMark[] {
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
    });
  }
  return marks;
}

function getDictionary(language: TLanguage): TLoadedDictionary {
  const dictionary = dictionaries.get(language);
  if (!dictionary) throw new Error(`Dictionary not loaded: ${language}`);
  return dictionary;
}

function runJob(job: TQueuedJob): TSpellcheckResult {
  switch (job.type) {
    case 'load':
      dictionaries.set(job.language, {
        typo: new Typo(job.locale, job.affData, job.wordsData),
        locale: job.locale,
      });
      return null;
    case 'check':
      return checkText(getDictionary(job.language), job.text);
    case 'suggest':
      return getDictionary(job.language).typo.suggest(job.word);
  }
}

function respond(response: TSpellcheckWorkerResponse): void {
  workerScope.postMessage(response);
}

// One job per macrotask, because a running job can't be interrupted -- yielding lets a `cancel`
// message that has already arrived remove queued work before it starts.
function schedule(): void {
  if (isScheduled || queue.length === 0) return;
  isScheduled = true;
  setTimeout(() => {
    isScheduled = false;
    const job = queue.shift();
    if (job) {
      try {
        respond({ id: job.id, result: runJob(job) });
      } catch (err) {
        respond({ id: job.id, error: err instanceof Error ? err.message : String(err) });
      }
    }
    schedule();
  }, 0);
}

workerScope.onmessage = ({ data }: MessageEvent<TSpellcheckWorkerRequest>) => {
  if (data.type === 'cancel') {
    const index = queue.findIndex((job) => job.id === data.id);
    if (index === -1) return;
    queue.splice(index, 1);
    respond({ id: data.id, result: null });
    return;
  }
  queue.push(data);
  schedule();
};

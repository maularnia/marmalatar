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

// Digits only, in any script, possibly joined by hyphens (a range like 1-2): not words to check
const ONLY_DIGITS = /^\p{Nd}+(?:[-\u2010\u2011]\p{Nd}+)*$/u;

// Hyphen-minus, hyphen and non-breaking hyphen: what joins the parts of one word (дзе-небудзь)
const WORD_HYPHENS = new Set(['-', '\u2010', '\u2011']);

type TWord = { word: string; index: number };

// The words of `text`. Intl.Segmenter splits at hyphens, so a word, a single hyphen and a word
// directly after one another are joined back into one: Hunspell knows hyphenated words as a whole.
function splitWords(text: string, locale: string): TWord[] {
  const segments = [...new Intl.Segmenter(locale, { granularity: 'word' }).segment(text)];
  const words: TWord[] = [];
  for (let i = 0; i < segments.length; i++) {
    const { segment, index, isWordLike } = segments[i];
    if (!isWordLike || !segment.trim()) continue;
    let word = segment;
    // Segments are contiguous, so adjacency in the list means adjacency in the text
    while (WORD_HYPHENS.has(segments[i + 1]?.segment ?? '') && segments[i + 2]?.isWordLike) {
      word += segments[i + 1].segment + segments[i + 2].segment;
      i += 2;
    }
    words.push({ word, index });
  }
  return words;
}

const dictionaries = new Map<TLanguage, TLoadedDictionary>();
const queue: TQueuedJob[] = [];
let isScheduled = false;

function checkText(
  { typo, locale }: TLoadedDictionary,
  text: string,
  ignored: ReadonlySet<string>
): SpellCheckMark[] {
  const marks: SpellCheckMark[] = [];
  for (const { word, index } of splitWords(text, locale)) {
    if (ONLY_DIGITS.test(word)) continue;
    // Words from the user dictionaries are accepted as they are, in any letter case
    if (ignored.has(word.toLocaleLowerCase())) continue;
    if (typo.check(word)) continue;
    marks.push({
      id: `${index}-${index + word.length}`,
      start: index,
      end: index + word.length,
      word,
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
      return checkText(getDictionary(job.language), job.text, new Set(job.ignored));
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

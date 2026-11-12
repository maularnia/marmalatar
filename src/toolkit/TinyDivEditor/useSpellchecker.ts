import { spellcheck } from '@src/services/spellcheck';
import { makeSpellcheckUnavailableMessage } from '@src/services/spellcheck/toasts';
import { createSpellCheckClient, type SpellCheckClient } from '@src/services/spellcheck/typoClient';
import { toast } from '@src/services/toast';
import { TLanguage } from '@src/types';
import { useAppSelector } from '@store/hooks';
import type { SpellCheckMark } from '@ui-toolkit/Mark';
import { useMemoizedObject } from '@utils/useMemoizedObject';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

enum TSpellcheckStatus {
  /** No language, or `enabled: false`: `check()` resolves at once and `markedText` is null */
  DISABLED = 'disabled',
  IDLE = 'idle',
  /** A `check()` is in flight (the dictionary load included) */
  CHECKING = 'checking',
  /** The last check failed (dictionary unreachable). Cleared by the next successful check */
  FAILED = 'failed',
}

/** The dictionaries a marked word can be added to. 'project' only while a project is open */
export type TDictionaryTarget = 'project' | 'global';

/** The last text that was checked, with the words marked in it. Kept together so a consumer can
 * tell whether the marks still belong to the text it shows (`text` equals it) */
type TMarkedText = { text: string; marks: SpellCheckMark[] };

type TCheckedText = TMarkedText & { language: TLanguage };

type TUseSpellcheckerOptions = {
  language: TLanguage | null | undefined;
  /** The consumer's "check spelling" switch; `false` behaves like no language */
  enabled: boolean;
};

type TSpellchecker = {
  /** `language` set and `enabled` */
  isEnabled: boolean;
  status: TSpellcheckStatus;
  /** Null while disabled or before the first check. `marks` is already filtered by the user
   * dictionaries, so it changes (without a new check) when a word is added to one */
  markedText: TMarkedText | null;
  /** Checks `text`. Skips the work when `text` was the last thing checked and nothing changed
   * since (dictionaries included). Resolves `false` only when a newer `check()`/`cancel()`
   * superseded it; a failed lookup resolves `true` -- the text is still valid, just unmarked */
  check: (text: string) => Promise<boolean>;
  /** Cancels the check and suggestion requests in flight */
  cancel: () => void;
  /** Suggestions for one misspelled word, in Hunspell's order (best guess first). Null when
   * superseded by a newer `suggest()`/`cancel()`, or while disabled */
  suggest: (word: string) => Promise<string[] | null>;
  /** Adds `word` to a dictionary. Its marks go through `markedText` once the store updates */
  addToDictionary: (target: TDictionaryTarget, word: string) => void;
};

const NO_WORDS: readonly string[] = [];

// The spellcheck of one editor: its own request client (so its checks cancel independently of
// other editors'), the marks of the last checked text, and the user dictionaries. It never touches
// the DOM -- it takes text and returns marks; when to check and how to show the marks is the
// editor's business.
export function useSpellchecker({ language, enabled }: TUseSpellcheckerOptions): TSpellchecker {
  const effectiveLanguage = enabled ? (language ?? null) : null;
  const isEnabled = effectiveLanguage !== null;
  const languageRef = useRef(effectiveLanguage);
  languageRef.current = effectiveLanguage;

  const clientRef = useRef<SpellCheckClient | null>(null);
  // As the dictionary returned it, tagged with the language it was checked against; `markedText`
  // below is this minus the user dictionaries' words, and null once the language is another one
  const [checkedText, setCheckedText] = useState<TCheckedText | null>(null);
  const [inFlight, setInFlight] = useState(0);
  const [failed, setFailed] = useState(false);
  // The text last checked successfully: `check()` skips it, from any caller (focus, typing,
  // external value change). Null whenever a check could give a different answer now.
  const checkedTextRef = useRef<string | null>(null);
  // Suppresses repeat error toasts for the same ongoing failure (e.g. every keystroke while the
  // dictionary is unreachable) -- reset on the next successful check so a later failure can still
  // be reported.
  const hasReportedErrorRef = useRef(false);

  // Words from the user dictionaries: never sent to the dictionary check, never marked
  const ignoredWords = useAppSelector((state) =>
    effectiveLanguage ? spellcheck.selectIgnoredWords(state, effectiveLanguage) : NO_WORDS
  );
  const ignoredWordsRef = useRef(ignoredWords);
  ignoredWordsRef.current = ignoredWords;

  // Each editor owns its own client (and cancellation tokens) -- recreated whenever the language
  // or the "check spelling" switch changes, cancelling whatever the previous client had in flight.
  // Whatever was checked under the old client no longer applies, so it's forgotten: the next
  // `check()` runs from scratch instead of mistaking stale text for "already checked". The marks
  // go at once (`markedText` is null for another language -- cheap cleanup, no dictionary lookup);
  // nothing runs eagerly for the new language -- the editor's next focus does the work.
  useEffect(() => {
    clientRef.current?.cancel();
    clientRef.current = effectiveLanguage ? createSpellCheckClient(effectiveLanguage) : null;
    checkedTextRef.current = null;
    return () => {
      clientRef.current?.cancel();
      clientRef.current = null;
    };
  }, [effectiveLanguage]);

  // Marks of a check against another language (or from before spellcheck was switched off) don't
  // apply. A word added to a user dictionary (or the open project changing) drops the marks on
  // words now accepted at once, without asking the dictionary again. Both are derived here rather
  // than stored, so they can't lag behind the props or the store. Same object as `checkedText`
  // when nothing is dropped, so consumers keyed on it don't re-run for nothing.
  const markedText = useMemo((): TMarkedText | null => {
    if (!checkedText || checkedText.language !== effectiveLanguage) return null;
    const ignored = new Set(ignoredWords);
    const remaining = checkedText.marks.filter(
      (mark) => !ignored.has(mark.word.toLocaleLowerCase())
    );
    return remaining.length === checkedText.marks.length
      ? checkedText
      : { ...checkedText, marks: remaining };
  }, [checkedText, effectiveLanguage, ignoredWords]);

  // The text counts as unchecked once the dictionaries change, so the next check uses the new list
  useEffect(() => {
    checkedTextRef.current = null;
  }, [ignoredWords]);

  const check = useCallback((text: string): Promise<boolean> => {
    if (text === checkedTextRef.current) return Promise.resolve(true);

    const client = clientRef.current;
    const checkLanguage = languageRef.current;
    // Spellcheck is off: nothing to do (`markedText` is already null). `checkedTextRef` stays
    // null (the client effect reset it) so enabling later is never mistaken for "unchanged, skip".
    if (!client || !checkLanguage) return Promise.resolve(true);

    if (!text) {
      checkedTextRef.current = text;
      setCheckedText({ language: checkLanguage, text, marks: [] });
      return Promise.resolve(true);
    }

    setInFlight((count) => count + 1);
    return client
      .request(text, ignoredWordsRef.current)
      .then((marks) => {
        if (marks === null) return false;
        setCheckedText({ language: checkLanguage, text, marks });
        checkedTextRef.current = text;
        hasReportedErrorRef.current = false;
        setFailed(false);
        return true;
      })
      .catch((err) => {
        if (!hasReportedErrorRef.current) {
          hasReportedErrorRef.current = true;
          toast.push(
            makeSpellcheckUnavailableMessage(
              err instanceof Error ? err.message : 'Could not load the dictionary.'
            )
          );
        }
        setFailed(true);
        // Unlike a superseded check, a failed one isn't replaced by anything -- the text is real
        // and the caller must still treat it as settled, just without marks.
        return true;
      })
      .finally(() => setInFlight((count) => count - 1));
  }, []);

  const cancel = useCallback(() => clientRef.current?.cancel(), []);

  const suggest = useCallback(
    (word: string): Promise<string[] | null> =>
      clientRef.current?.suggest(word) ?? Promise.resolve(null),
    []
  );

  const addToDictionary = useCallback((target: TDictionaryTarget, word: string) => {
    const currentLanguage = languageRef.current;
    if (!currentLanguage) return;
    if (target === 'project') void spellcheck.addToProjectDictionary(currentLanguage, word);
    else void spellcheck.addToGlobalDictionary(currentLanguage, word);
  }, []);

  const status = !isEnabled
    ? TSpellcheckStatus.DISABLED
    : inFlight > 0
      ? TSpellcheckStatus.CHECKING
      : failed
        ? TSpellcheckStatus.FAILED
        : TSpellcheckStatus.IDLE;

  return useMemoizedObject({
    isEnabled,
    status,
    markedText,
    check,
    cancel,
    suggest,
    addToDictionary,
  });
}

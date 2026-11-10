import { z } from 'zod';

// A global spellcheck dictionary, one {languageCode}.mrmlspell file per language in the tracked
// folder: words the spellcheck accepts in every project
export const SpellcheckDictionaryFileSchema = z.object({
  version: z.literal(1).default(1),
  wordlist: z.array(z.string()).catch([]),
});

// A project's own accepted words per language code, in the .mrml file's `spellcheck` property. A
// language's key exists only once a word was added for it.
export const ProjectSpellcheckSchema = z.record(z.string(), z.array(z.string()));
export type TProjectSpellcheck = z.infer<typeof ProjectSpellcheckSchema>;

/** The word list with `word` added, unless it's already there in any letter case. Words are stored
 * as typed; matching them is case-insensitive. */
export function addDictionaryWord(words: readonly string[], word: string): string[] {
  const trimmed = word.trim();
  if (!trimmed) return [...words];
  const lower = trimmed.toLocaleLowerCase();
  return words.some((existing) => existing.toLocaleLowerCase() === lower)
    ? [...words]
    : [...words, trimmed];
}

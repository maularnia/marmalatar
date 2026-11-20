import type { TLanguage } from '@src/types';
import type { SpellCheckMark } from '@ui-toolkit/Mark';

export type TSpellcheckJob =
  | { type: 'load'; language: TLanguage; locale: string; affData: string; wordsData: string }
  // ignored: lowercased words from the user dictionaries, never checked or marked
  | { type: 'check'; language: TLanguage; text: string; ignored: string[] }
  | { type: 'suggest'; language: TLanguage; word: string };

export type TSpellcheckResult = SpellCheckMark[] | string[] | null;

export type TSpellcheckWorkerRequest =
  (TSpellcheckJob & { id: number }) | { type: 'cancel'; id: number };

export type TSpellcheckWorkerResponse =
  { id: number; result: TSpellcheckResult } | { id: number; error: string };

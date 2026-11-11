import type { TProjectSpellcheck } from '@bridge/definitions/spellcheckDictionary';
import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { folder } from '@src/services/folder';
import { projects } from '@src/services/project';

// Words the spellcheck accepts besides its bundled dictionaries, by language code (BE_be): the
// tracked folder's global dictionaries ({languageCode}.mrmlspell) and the open project's own (its
// file's `spellcheck`). Stored as typed; matched case-insensitively.
type SpellcheckState = {
  globalDictionaries: Record<string, string[]>;
  projectDictionaries: TProjectSpellcheck;
};

const initialState: SpellcheckState = {
  globalDictionaries: {},
  projectDictionaries: {},
};

const NO_WORDS: string[] = [];

const spellcheckSlice = createSlice({
  name: 'spellcheck',
  initialState,
  reducers: {
    setGlobalDictionaries(state, action: PayloadAction<Record<string, string[]>>) {
      state.globalDictionaries = action.payload;
    },
    // An empty list means the language's file is gone: no dictionary for it any more
    setGlobalDictionary(state, action: PayloadAction<{ language: string; words: string[] }>) {
      const { language, words } = action.payload;
      if (words.length) state.globalDictionaries[language] = words;
      else delete state.globalDictionaries[language];
    },
    setProjectDictionaries(state, action: PayloadAction<TProjectSpellcheck>) {
      state.projectDictionaries = action.payload;
    },
  },
  extraReducers(builder) {
    builder
      // The project service doesn't import this one, so it reports a loaded file instead
      .addCase(projects.fileLoaded, (state, action) => {
        state.projectDictionaries = action.payload.spellcheck;
      })
      // Another folder: its dictionaries are loaded once it's scanned (see index.ts)
      .addCase(folder.pathChanged, (): SpellcheckState => initialState);
  },
  selectors: {
    selectGlobalDictionaries: (state) => state.globalDictionaries,
    // One language's global words. Memoized per language, so editors of different languages
    // don't evict each other's result.
    selectGlobalDictionary: createSelector(
      [
        (state: SpellcheckState) => state.globalDictionaries,
        (_: SpellcheckState, language: string) => language,
      ],
      (dictionaries, language) => dictionaries[language] ?? NO_WORDS
    ),
    // Languages that have a global dictionary file
    selectAvailableDictionaries: createSelector(
      [(state: SpellcheckState) => state.globalDictionaries],
      (dictionaries) => Object.keys(dictionaries)
    ),
    selectProjectDictionaries: (state) => state.projectDictionaries,
  },
});

export const { setGlobalDictionaries, setGlobalDictionary, setProjectDictionaries } =
  spellcheckSlice.actions;

export const {
  selectGlobalDictionaries,
  selectGlobalDictionary,
  selectAvailableDictionaries,
  selectProjectDictionaries,
} = spellcheckSlice.selectors;

type TSpellcheckRootState = Parameters<typeof projects.selectIsOpen>[0] & {
  spellcheck: SpellcheckState;
};

/** Every word the spellcheck skips for a language, lowercased: the global dictionary's, and the
 * open project's. Memoized per language. */
export const selectIgnoredWords = createSelector(
  [
    (state: TSpellcheckRootState, language: string) =>
      state.spellcheck.globalDictionaries[language] ?? NO_WORDS,
    (state: TSpellcheckRootState, language: string) =>
      projects.selectIsOpen(state)
        ? (state.spellcheck.projectDictionaries[language] ?? NO_WORDS)
        : NO_WORDS,
  ],
  (globalWords, projectWords) => [
    ...new Set([...globalWords, ...projectWords].map((word) => word.toLocaleLowerCase())),
  ]
);

/** The open project's dictionaries that have words, by language code; none without a project */
export const selectProjectDictionariesWithWords = createSelector(
  [
    (state: TSpellcheckRootState) => projects.selectIsOpen(state),
    (state: TSpellcheckRootState) => state.spellcheck.projectDictionaries,
  ],
  (isOpen, dictionaries): TProjectSpellcheck =>
    isOpen
      ? Object.fromEntries(Object.entries(dictionaries).filter(([, words]) => words.length))
      : {}
);

/** Whether there's a project dictionary to add words to: only while a project is open */
export const selectCanAddToProjectDictionary = (state: TSpellcheckRootState): boolean =>
  projects.selectIsOpen(state);

export default spellcheckSlice.reducer;

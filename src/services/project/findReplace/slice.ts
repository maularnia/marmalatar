import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { selectLines } from '../editor/slice';

// The columns Find & Replace searches and moves between. The character column is never part of it.
export type TFindReplaceColumn = 'source' | 'output';

type TFindReplaceSliceState = {
  isOpen: boolean;
  query: string;
  replacement: string;
  // The lines the last query change found, by number. Rebuilt only when the query changes, so a
  // row stays listed while the user edits it, even once it no longer matches.
  resultLineNos: number[];
  // The overlay's own focus, apart from the editor's: the main table keeps its focused line while
  // the overlay is open, and gets it back when it closes
  focusedResultIndex: number | null;
  focusedColumn: TFindReplaceColumn | null;
};

const initialState: TFindReplaceSliceState = {
  isOpen: false,
  query: '',
  replacement: '',
  resultLineNos: [],
  focusedResultIndex: null,
  focusedColumn: null,
};

// No extraReducers resetting it on a folder or project change: neither can happen while the
// overlay is open -- reaching that UI is a click outside it, which closes and resets it first.
const findReplaceSlice = createSlice({
  name: 'findReplace',
  initialState,
  reducers: {
    findReplaceOpened(state, action: PayloadAction<{ lineNos: number[] }>) {
      if (state.isOpen) return;
      state.isOpen = true;
      state.resultLineNos = action.payload.lineNos;
    },
    findReplaceClosed() {
      return initialState;
    },
    queryChanged(state, action: PayloadAction<{ query: string; lineNos: number[] }>) {
      state.query = action.payload.query;
      state.resultLineNos = action.payload.lineNos;
      state.focusedResultIndex = null;
      state.focusedColumn = null;
    },
    setFindReplaceReplacement(state, action: PayloadAction<string>) {
      state.replacement = action.payload;
    },
    focusedResultChanged(
      state,
      action: PayloadAction<{ index: number | null; column: TFindReplaceColumn | null }>
    ) {
      state.focusedResultIndex = action.payload.index;
      state.focusedColumn = action.payload.column;
    },
    focusedColumnCleared(state) {
      state.focusedColumn = null;
    },
  },
  selectors: {
    selectIsFindReplaceOpen: (state) => state.isOpen,
    selectFindReplaceQuery: (state) => state.query,
    selectFindReplaceReplacement: (state) => state.replacement,
    selectFindReplaceResultLineNos: (state) => state.resultLineNos,
    selectFindReplaceFocusedResultIndex: (state) => state.focusedResultIndex,
    selectFindReplaceFocusedColumn: (state) => state.focusedColumn,
    // Replacing is on whenever there's something to replace with
    selectCanFindReplaceReplace: (state) => state.replacement !== '',
    selectCanFindReplaceReplaceAll: (state) => state.replacement !== '' && state.query !== '',
  },
});

export const {
  findReplaceOpened,
  findReplaceClosed,
  queryChanged,
  setFindReplaceReplacement,
  focusedResultChanged,
  focusedColumnCleared,
} = findReplaceSlice.actions;

export const {
  selectIsFindReplaceOpen,
  selectFindReplaceQuery,
  selectFindReplaceReplacement,
  selectCanFindReplaceReplace,
  selectFindReplaceFocusedResultIndex,
  selectFindReplaceFocusedColumn,
  selectCanFindReplaceReplaceAll,
} = findReplaceSlice.selectors;

// The listed lines, in project order: the found line numbers that still exist (a line merged or
// removed since, by undo for instance, drops out). Result indices -- focus, navigation -- index
// into this list. Reads the editor's lines directly: same service, no cycle.
export const selectFindReplaceResultLines = createSelector(
  [findReplaceSlice.selectors.selectFindReplaceResultLineNos, selectLines],
  (lineNos, lines) => {
    const found = new Set(lineNos);
    return lines.filter((line) => found.has(line.line_no));
  }
);

export default findReplaceSlice.reducer;

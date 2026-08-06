import { createListenerMiddleware } from '@reduxjs/toolkit';
import { buildProjectEditorStateSaveData, writeProjectEditorState } from '@src/utils/data/discIO';
import type { RootState } from './root';

// Device-specific editor/UI preferences (editorMode, isVideoCollapsed, video path) --
// these aren't project content, so they're persisted to electron-store keyed by
// projectId instead of triggering a .mrml file rewrite (see persistProjectState.ts).
const EDITOR_STATE_WATCHED_PATHS = {
  project: ['editorMode', 'videoFilePath'],
  editor: ['isVideoCollapsed'],
} as const satisfies {
  project: readonly (keyof RootState['project'])[];
  editor: readonly (keyof RootState['editor'])[];
};

type EditorStateWatchedPathsType = typeof EDITOR_STATE_WATCHED_PATHS;

function hasEditorStateChanged(prev: RootState, next: RootState): boolean {
  for (const [sliceKey, props] of Object.entries(EDITOR_STATE_WATCHED_PATHS) as [
    keyof EditorStateWatchedPathsType,
    readonly string[],
  ][]) {
    for (const prop of props) {
      if (
        prev[sliceKey][prop as keyof (typeof prev)[typeof sliceKey]] !==
        next[sliceKey][prop as keyof (typeof next)[typeof sliceKey]]
      ) {
        return true;
      }
    }
  }
  return false;
}

export const persistEditorStateMiddleware = createListenerMiddleware();

persistEditorStateMiddleware.startListening({
  predicate: (_action, currentState, previousState) =>
    hasEditorStateChanged(previousState as RootState, currentState as RootState),

  effect: async (_action, api) => {
    api.cancelActiveListeners();
    await api.delay(1500);

    const state = api.getState() as RootState;
    const projectId = state.project.projectId;
    if (!projectId) return;

    await writeProjectEditorState(projectId, buildProjectEditorStateSaveData(state));
  },
});

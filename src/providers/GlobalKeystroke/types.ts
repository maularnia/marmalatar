/** Digits 1-9 then 0, matching a keyboard's number row -- the order zones are assigned slots in. */
export type TKeystrokeSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 0;

export type TGlobalKeystrokeContext = {
  /** Finds the lowest free slot, stores `focusAction`, and returns the assigned slot number. */
  registerZone: (focusAction: () => void) => TKeystrokeSlot;
  unregisterZone: (slot: TKeystrokeSlot) => void;
  /** Pauses (or resumes) the global ctrl+1..0/esc dispatcher. Keyed by an arbitrary `source`
   * string rather than a single boolean so independent pausers (today: just Confirmation) can't
   * accidentally un-pause each other on cleanup. */
  setPaused: (source: string, paused: boolean) => void;
};

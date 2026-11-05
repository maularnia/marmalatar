import { bridgeNotMounted } from './bridgeNotMounted';

type TVideoBridge = {
  playPause: () => void;
  seekToLine: (lineIndex: number) => void;
};

let video: TVideoBridge | null = null;

/** Called by `VideoProvider` on mount; the returned function unregisters it. */
export function registerVideoBridge(value: TVideoBridge): () => void {
  video = value;
  return () => {
    if (video === value) video = null;
  };
}

const get = (): TVideoBridge => video ?? bridgeNotMounted('video');

export const playPause = (): void => get().playPause();
export const seekToLine = (lineIndex: number): void => get().seekToLine(lineIndex);

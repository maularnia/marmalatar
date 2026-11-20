// The files a selected video plays from: the video itself, plus its converted audio and its
// waveform in the media cache. The main process's health beacon watches them while a video is
// selected and reports when any of them goes missing or breaks.

export type TMediaBundlePart = 'video' | 'audio' | 'waveform';

/** A video bundle's health, keyed by the video and audio track it belongs to */
export type TMediaBundleStatus =
  | { videoPath: string; trackId: number; ok: true }
  | { videoPath: string; trackId: number; ok: false; broken: TMediaBundlePart[] };

// The push channel the main process reports a broken bundle on (main → renderer)
export const MEDIA_BUNDLE_LOST_CHANNEL = 'media.bundle-lost';

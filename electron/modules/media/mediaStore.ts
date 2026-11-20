import path from 'path';
import type { TAudioTrack } from '../../../bridge/definitions/audioTrack';

// Cache folders inside {trackedFolder}/.mrmlcache
export type TCacheKind = 'previews' | 'audio' | 'waveforms';
export const CACHE_KINDS: readonly TCacheKind[] = ['previews', 'audio', 'waveforms'];

// One audio stream of a video, plus the files generated from it
export type TAudioTrackMeta = TAudioTrack & {
  // Converted audio, in .mrmlcache/audio
  cache?: string;
  // Waveform peaks of the converted audio, in .mrmlcache/waveforms
  waveform?: string;
};

// What the service knows about, and has generated from, one video
export type TVideoFileMeta = {
  filePath: string;
  // Thumbnail, in .mrmlcache/previews
  thumb?: string;
  // Displayed width / height (CSS aspect-ratio order). Undefined until probed, or when ffprobe
  // couldn't read it, in which case the next request probes again.
  aspectRatio?: number;
  // Undefined until the video's streams have been listed
  audioTracks?: TAudioTrackMeta[];
};

export type TMediaData = {
  // Keyed by the video's hash (getFileCacheKey: path, size, mtime). A changed video gets a new hash
  // and so a new, empty entry; the old one and its files go on the next cleanup.
  videos: Record<string, TVideoFileMeta>;
};

export function cacheDir(trackedFolder: string, kind: TCacheKind): string {
  return path.join(trackedFolder, '.mrmlcache', kind);
}

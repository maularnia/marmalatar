import path from 'path';
import fs from 'fs';
import { runWithFallback } from '../../utils/runWithFallback';
import { getFileCacheKey } from '../../utils/fileCacheKey';
import { getAspectRatio, listAudioTracks } from './metadata';
import { cacheDir, type TMediaData, type TVideoFileMeta } from './mediaStore';

// Version 0 kept no media metadata: cache files were found by the video's key alone, and only the
// first audio stream was ever converted. This builds an entry for every project video from the
// files that are already there, so nothing is regenerated after the update.
export async function migrateV0Media(
  store: Readonly<Record<string, unknown>>
): Promise<Partial<TMediaData>> {
  // 1. The cache lives in the tracked folder; without one there's nothing to pick up
  const trackedFolder = store.trackedFolder;
  if (typeof trackedFolder !== 'string' || !fs.existsSync(trackedFolder)) return {};

  // 2. Version 0 kept each project's video path in projectStates, keyed by projectId. Skip videos
  //    that are gone, and ones another project already shares.
  const legacyStates = (store.projectStates ?? {}) as Record<string, { videoPath?: unknown }>;
  const videoPaths = new Map<string, string>();
  for (const legacyState of Object.values(legacyStates)) {
    const videoPath = legacyState?.videoPath;
    if (typeof videoPath !== 'string' || !fs.existsSync(videoPath)) continue;
    const hash = runWithFallback(() => getFileCacheKey(videoPath), null);
    if (hash && !videoPaths.has(hash)) videoPaths.set(hash, videoPath);
  }

  const entries = await Promise.all(
    [...videoPaths].map(async ([hash, videoPath]): Promise<[string, TVideoFileMeta]> => {
      // 3. Thumbnail: version 0 used the same {hash}.jpg name, so it carries over as is
      const entry: TVideoFileMeta = { filePath: videoPath };
      const thumb = `${hash}.jpg`;
      if (fs.existsSync(path.join(cacheDir(trackedFolder, 'previews'), thumb))) {
        entry.thumb = thumb;
      }

      // 4. Aspect ratio and audio tracks, probed the same way the service does at runtime. A file
      //    ffprobe can't read gets them on first use instead.
      const [aspectRatio, tracks] = await Promise.all([
        getAspectRatio(videoPath),
        listAudioTracks(videoPath).catch(() => null),
      ]);
      if (aspectRatio !== null) entry.aspectRatio = aspectRatio;
      if (!tracks) return [hash, entry];
      entry.audioTracks = tracks;

      // 5. Converted audio: version 0 wrote {hash}.m4a from the first audio stream (-map 0:a:0)
      const audio = `${hash}.m4a`;
      const audioFile = path.join(cacheDir(trackedFolder, 'audio'), audio);
      if (!tracks.length || !fs.existsSync(audioFile)) return [hash, entry];

      // 6. Waveform: version 0 keyed it by the converted audio file, not the video
      const waveformKey = runWithFallback(() => getFileCacheKey(audioFile), null);
      const waveform = waveformKey && `${waveformKey}.json`;
      const hasWaveform =
        waveform && fs.existsSync(path.join(cacheDir(trackedFolder, 'waveforms'), waveform));

      // 7. The old audio and waveform belong to the first track, the stream version 0 converted;
      //    the other tracks start with nothing cached
      entry.audioTracks = tracks.map((track, index) =>
        index === 0 ? { ...track, cache: audio, ...(hasWaveform && { waveform }) } : track
      );
      return [hash, entry];
    })
  );
  return { videos: Object.fromEntries(entries) };
}

import { app, type IpcMainInvokeEvent } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import type { TAudioTrack } from '../../../bridge/definitions/audioTrack';
import { runWithFallback } from '../../utils/runWithFallback';
import { getFileCacheKey } from '../../utils/fileCacheKey';
import { ProjectService } from '../project/ProjectService';
import { ScannerService } from '../scanner/ScannerService';
import { Service } from '../service/Service';
import type { TVersioning } from '../service/storeVersioning';
import { getAspectRatio, getDuration, listAudioTracks } from './metadata';
import { MEDIA_BUNDLE_LOST_CHANNEL } from '../../../bridge/definitions/mediaBundle';
import { MediaHealthBeacon, type TMediaBundleFiles } from './MediaHealthBeacon';
import {
  CACHE_KINDS,
  cacheDir,
  type TAudioTrackMeta,
  type TCacheKind,
  type TMediaData,
  type TVideoFileMeta,
} from './mediaStore';
import { migrateV0Media } from './migrateV0Media';

// Forge's Vite plugin strips node_modules from the packaged app, so ffmpeg-static's
// JS (and its own __dirname-based path lookup) isn't available at runtime. The binary
// is copied in via packagerConfig.extraResource instead, and located relative to that.
// In development __dirname is the bundled out/main, not this source file's folder.
const ffmpegBinaryName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
const ffmpegPath = app.isPackaged
  ? path.join(process.resourcesPath, 'ffmpeg-static', ffmpegBinaryName)
  : path.join(__dirname, '../../node_modules/ffmpeg-static', ffmpegBinaryName);

const WAVEFORM_SAMPLE_RATE = 44100;
const WAVEFORM_PEAKS_PER_SECOND = 23;

// The service names every file it generates after the video's hash, and the track's stream index
// for per-track files, so each track of a video gets its own audio and waveform
const fileNames = {
  thumb: (hash: string) => `${hash}.jpg`,
  audio: (hash: string, trackId: number) => `${hash}-${trackId}.m4a`,
  waveform: (hash: string, trackId: number) => `${hash}-${trackId}.json`,
};

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Matches ffmpeg's own build-info banner lines (version/build-flags/library-version lines) --
// filtered out below so they don't crowd out the actual error in short outputs.
const FFMPEG_BANNER_LINE = /^(ffmpeg version|built with|configuration:|lib\w+\s+\d+\.\s*\d+\.\d+)/;

// Builds an Error whose message includes ffmpeg's own stderr output (its actual diagnostic,
// e.g. "Unknown encoder", "No such file or directory") rather than just an opaque exit code --
// this is what the renderer's pushMessage toasts actually display, so a bare "exited with code 1"
// wasn't telling anyone anything. Keeps only the tail of stderr (minus the build-info banner)
// since ffmpeg's real error is almost always the last few lines; verified against real failures
// (missing file, unknown encoder) that the actionable message survives this trim.
function ffmpegError(context: string, code: number | null, stderr: string): Error {
  const meaningfulLines = stderr
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !FFMPEG_BANNER_LINE.test(line));
  const tail = meaningfulLines.slice(-10).join('\n');
  return new Error(
    tail ? `${context} (exit code ${code}): ${tail}` : `${context} (exit code ${code})`
  );
}

// Runs ffmpeg and resolves with its stdout. Rejects with ffmpeg's own diagnostic when it exits with
// an error -- unless `tolerateExitCode` and it still produced output, which a partial read of a
// slightly broken file does.
function runFfmpeg(
  args: string[],
  context: string,
  { tolerateExitCode = false }: { tolerateExitCode?: boolean } = {}
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks: Buffer[] = [];
    proc.stdout?.on('data', (chunk: Buffer) => chunks.push(chunk));
    proc.stdout?.on('error', reject);
    let stderr = '';
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on('close', (code) => {
      if (code !== 0 && !(tolerateExitCode && chunks.length > 0)) {
        return reject(ffmpegError(context, code, stderr));
      }
      resolve(Buffer.concat(chunks));
    });
    proc.on('error', reject);
  });
}

// A 640px-wide JPEG at roughly 1/3 of the video's duration
async function renderThumbnail(videoPath: string): Promise<Buffer> {
  const duration = await getDuration(videoPath);
  const seekTime = duration ? Math.max(1, duration / 3) : 5;
  return runFfmpeg(
    [
      '-ss',
      String(seekTime),
      '-i',
      videoPath,
      '-frames:v',
      '1',
      '-vf',
      'scale=640:-1',
      '-f',
      'image2pipe',
      '-vcodec',
      'mjpeg',
      'pipe:1',
    ],
    'ffmpeg thumbnail generation failed',
    { tolerateExitCode: true }
  );
}

// Writes one audio stream of the video to an AAC file. Already-AAC audio is stream-copied (no
// re-encode, channels/bitrate kept as-is); anything else is transcoded to AAC stereo 192kbps.
// -map 0:{id} selects just that stream -- plain -vn only excludes video. -map_chapters -1 stops
// chapter markers (e.g. from .mkv) from being auto-copied in as a stray "Data: bin_data" text track
// alongside the audio (confirmed via real-world test).
async function convertAudioTrack(
  videoPath: string,
  track: TAudioTrack,
  outFile: string
): Promise<void> {
  const encoding =
    track.codec?.toLowerCase() === 'aac'
      ? ['-c:a', 'copy']
      : ['-ac', '2', '-c:a', 'aac', '-b:a', '192k'];
  await runFfmpeg(
    ['-i', videoPath, '-map', `0:${track.id}`, '-map_chapters', '-1', ...encoding, '-y', outFile],
    'ffmpeg audio extraction failed'
  );
}

// Normalised [0,1] peaks at WAVEFORM_PEAKS_PER_SECOND, so resolution doesn't depend on length
async function computeWaveformPeaks(audioFile: string): Promise<number[]> {
  const buf = await runFfmpeg(
    [
      '-i',
      audioFile,
      '-vn', // skip video
      '-ac',
      '1', // mono
      '-ar',
      String(WAVEFORM_SAMPLE_RATE),
      '-f',
      's16le', // raw signed 16-bit little-endian PCM
      'pipe:1',
    ],
    'ffmpeg waveform extraction failed',
    { tolerateExitCode: true }
  );
  const sampleCount = buf.length / 2; // 2 bytes per s16 sample
  const blockSize = Math.round(WAVEFORM_SAMPLE_RATE / WAVEFORM_PEAKS_PER_SECOND);
  const peakCount = Math.ceil(sampleCount / blockSize);
  const peaks: number[] = [];

  for (let i = 0; i < peakCount; i++) {
    let sum = 0;
    const start = i * blockSize;
    const end = Math.min(start + blockSize, sampleCount);
    for (let j = start; j < end; j++) {
      sum += Math.abs(buf.readInt16LE(j * 2));
    }
    peaks.push(end > start ? sum / (end - start) : 0);
  }

  // Not Math.max(...peaks): a feature-length film exceeds the engine's argument limit
  const max = peaks.reduce((highest, peak) => Math.max(highest, peak), 1);
  return peaks.map((p) => p / max);
}

// Peaks from a cached waveform file, or null if it's missing, unreadable, or was built at another
// rate (or in the older bare-array format)
function readWaveformFile(file: string): number[] | null {
  return runWithFallback(() => {
    const cached = JSON.parse(fs.readFileSync(file, 'utf8')) as {
      peaksPerSecond?: number;
      peaks?: number[];
    };
    return cached.peaksPerSecond === WAVEFORM_PEAKS_PER_SECOND && cached.peaks
      ? cached.peaks
      : null;
  }, null);
}

function toAudioTrack({ cache: _, waveform: __, ...track }: TAudioTrackMeta): TAudioTrack {
  return track;
}

export class MediaService extends Service<TMediaData> {
  static readonly serviceName = 'media';

  readonly versioning: TVersioning<TMediaData> = {
    0: migrateV0Media,
  };

  // Tracks the health of the video bundle the renderer selected; the service only exposes it
  private readonly healthBeacon = new MediaHealthBeacon();
  // Windows that already stop the beacon when they close
  private readonly beaconSenders = new WeakSet<Electron.WebContents>();

  readonly handlers = [
    // Waveform peaks of one audio track of a video (the first one by default): number[] of
    // normalised [0,1] peaks. Computed from the track's converted audio, which is created first if
    // needed, and cached in .mrmlcache/waveforms as { peaksPerSecond, peaks }.
    this.handle(
      'extract-waveform-peaks',
      async (_: IpcMainInvokeEvent, videoPath: string, trackId?: number) => {
        const trackedFolder = this.requireTrackedFolder();
        const { hash, track } = await this.ensureConvertedTrack(videoPath, trackId);
        const dir = cacheDir(trackedFolder, 'waveforms');

        const cached = track.waveform && readWaveformFile(path.join(dir, track.waveform));
        if (cached) return cached;

        const peaks = await computeWaveformPeaks(
          path.join(cacheDir(trackedFolder, 'audio'), track.cache)
        );
        const waveform = fileNames.waveform(hash, track.id);
        try {
          ensureDir(dir);
          fs.writeFileSync(
            path.join(dir, waveform),
            JSON.stringify({ peaksPerSecond: WAVEFORM_PEAKS_PER_SECOND, peaks }),
            'utf8'
          );
          this.updateTrack(hash, track.id, { waveform });
        } catch {
          /* non-fatal */
        }
        return peaks;
      }
    ),

    // What the UI shows of the video before playing it: a thumbnail, as a base64 data URL
    // ("data:image/jpeg;base64,..."), and its displayed aspect ratio (width / height). Both are
    // cached in the video's entry; either is null when it can't be produced, without failing the
    // other.
    this.handle('get-video-metadata', async (_: IpcMainInvokeEvent, videoPath: string) => {
      const { hash, entry } = this.getEntry(videoPath);
      const [thumbnail, aspectRatio] = await Promise.all([
        this.loadThumbnail(hash, entry, videoPath),
        this.loadAspectRatio(hash, entry, videoPath),
      ]);
      return { thumbnail, aspectRatio };
    }),

    // Every audio stream of the video, listed once with ffprobe and then served from the store
    this.handle('list-audio-tracks', async (_: IpcMainInvokeEvent, videoPath: string) =>
      (await this.ensureTracks(videoPath)).tracks.map(toAudioTrack)
    ),

    // Converts one audio track of the video (the first one by default) to AAC, once. Returns the
    // converted file's absolute path, not inline bytes -- the renderer needs a real file:// path
    // for an <audio> element.
    this.handle(
      'extract-audio',
      async (_: IpcMainInvokeEvent, videoPath: string, trackId?: number) => {
        const trackedFolder = this.requireTrackedFolder();
        const { track } = await this.ensureConvertedTrack(videoPath, trackId);
        return path.join(cacheDir(trackedFolder, 'audio'), track.cache);
      }
    ),

    // Starts tracking the bundle of the video the renderer just selected (the video, its converted
    // audio and waveform for that track): checks it at once and returns its status, then reports
    // on MEDIA_BUNDLE_LOST_CHANNEL to the calling window the moment any part breaks. Throws when
    // the beacon is still tracking or failed: the renderer must stop it first (see
    // MediaHealthBeacon).
    this.handle(
      'start-health-beacon',
      async (event: IpcMainInvokeEvent, videoPath: string, trackId: number) => {
        const sender = event.sender;
        const bundle = this.resolveBundle(videoPath, trackId);
        const status = await this.healthBeacon.start(bundle, (lost) => {
          if (!sender.isDestroyed()) sender.send(MEDIA_BUNDLE_LOST_CHANNEL, lost);
        });
        // A closed window can't hear about its bundle any more: nothing left to track for it
        if (!this.beaconSenders.has(sender)) {
          this.beaconSenders.add(sender);
          sender.once('destroyed', () => this.healthBeacon.stop());
        }
        return status;
      }
    ),

    // Stops tracking (and acknowledges a failure). A beacon that isn't tracking stays as it is.
    this.handle('stop-health-beacon', () => this.healthBeacon.stop()),

    // Drops the metadata of videos no project uses any more, or whose file changed since, along
    // with every cache file no remaining entry refers to. Videos in use are resolved by the project
    // service from its own list, not the renderer's, so this is right even if the renderer's
    // project list is stale.
    this.handle('cleanup-cache', () => {
      const trackedFolder = ScannerService.getInstance().getWorkFolderPath();
      if (!trackedFolder) return;

      const inUse = new Set(
        ProjectService.getInstance()
          .listVideoPaths()
          .map((videoPath) => runWithFallback(() => getFileCacheKey(videoPath), null))
      );
      const videos = Object.fromEntries(
        Object.entries(this.readVideos()).filter(([hash]) => inUse.has(hash))
      );
      this.store.set('videos', videos);

      const referenced: Record<TCacheKind, Set<string>> = {
        previews: new Set(),
        audio: new Set(),
        waveforms: new Set(),
      };
      for (const { thumb, audioTracks } of Object.values(videos)) {
        if (thumb) referenced.previews.add(thumb);
        for (const { cache, waveform } of audioTracks ?? []) {
          if (cache) referenced.audio.add(cache);
          if (waveform) referenced.waveforms.add(waveform);
        }
      }
      for (const kind of CACHE_KINDS) {
        const dir = cacheDir(trackedFolder, kind);
        for (const fileName of runWithFallback(() => fs.readdirSync(dir), [])) {
          if (!referenced[kind].has(fileName)) {
            runWithFallback(() => fs.unlinkSync(path.join(dir, fileName)), undefined);
          }
        }
      }
    }),
  ] as const;

  // The files a video plays from for one of its tracks, as the service knows them. A part it has
  // no file for (or a video that can't even be read) comes back null and counts as broken.
  private resolveBundle(videoPath: string, trackId: number): TMediaBundleFiles {
    const trackedFolder = ScannerService.getInstance().getWorkFolderPath();
    const hash = runWithFallback(() => getFileCacheKey(videoPath), null);
    const track = hash ? this.readVideos()[hash]?.audioTracks?.find((t) => t.id === trackId) : null;
    const inCache = (kind: TCacheKind, fileName: string | undefined) =>
      trackedFolder && fileName ? path.join(cacheDir(trackedFolder, kind), fileName) : null;
    return {
      videoPath,
      trackId,
      files: {
        video: videoPath,
        audio: inCache('audio', track?.cache),
        waveform: inCache('waveforms', track?.waveform),
      },
      validators: { waveform: (file) => readWaveformFile(file) !== null },
    };
  }

  private requireTrackedFolder(): string {
    const trackedFolder = ScannerService.getInstance().getWorkFolderPath();
    if (!trackedFolder) throw new Error('No tracked folder available to cache media');
    return trackedFolder;
  }

  private readVideos(): Record<string, TVideoFileMeta> {
    return this.store.get('videos') ?? {};
  }

  // The video's entry under its current hash, created empty for a new or changed file
  private getEntry(videoPath: string): { hash: string; entry: TVideoFileMeta } {
    const hash = getFileCacheKey(videoPath);
    const videos = this.readVideos();
    const entry = videos[hash] ?? { filePath: videoPath };
    if (!videos[hash]) this.store.set('videos', { ...videos, [hash]: entry });
    return { hash, entry };
  }

  // Read-modify-write against the stored entry, so concurrent handlers don't drop each other's
  // updates
  // The cached thumbnail, or a freshly rendered (and cached) one; null if rendering fails
  private async loadThumbnail(
    hash: string,
    entry: TVideoFileMeta,
    videoPath: string
  ): Promise<string | null> {
    const trackedFolder = ScannerService.getInstance().getWorkFolderPath();
    const toDataUrl = (buf: Buffer) => `data:image/jpeg;base64,${buf.toString('base64')}`;

    if (trackedFolder && entry.thumb) {
      const cached = runWithFallback(
        () => fs.readFileSync(path.join(cacheDir(trackedFolder, 'previews'), entry.thumb!)),
        null
      );
      if (cached) return toDataUrl(cached);
    }

    let buf: Buffer;
    try {
      buf = await renderThumbnail(videoPath);
    } catch (error) {
      console.warn(error);
      return null;
    }
    if (trackedFolder) {
      const thumb = fileNames.thumb(hash);
      try {
        const dir = cacheDir(trackedFolder, 'previews');
        ensureDir(dir);
        fs.writeFileSync(path.join(dir, thumb), buf);
        this.updateEntry(hash, { thumb });
      } catch {
        /* non-fatal */
      }
    }
    return toDataUrl(buf);
  }

  // The cached aspect ratio, or a freshly probed one, cached when ffprobe could read it
  private async loadAspectRatio(
    hash: string,
    entry: TVideoFileMeta,
    videoPath: string
  ): Promise<number | null> {
    if (entry.aspectRatio) return entry.aspectRatio;
    const aspectRatio = await getAspectRatio(videoPath);
    if (aspectRatio !== null) this.updateEntry(hash, { aspectRatio });
    return aspectRatio;
  }

  private updateEntry(hash: string, patch: Partial<TVideoFileMeta>): void {
    const videos = this.readVideos();
    const entry = videos[hash];
    if (!entry) return;
    this.store.set('videos', { ...videos, [hash]: { ...entry, ...patch } });
  }

  private updateTrack(hash: string, trackId: number, patch: Partial<TAudioTrackMeta>): void {
    const tracks = this.readVideos()[hash]?.audioTracks;
    if (!tracks) return;
    this.updateEntry(hash, {
      audioTracks: tracks.map((track) => (track.id === trackId ? { ...track, ...patch } : track)),
    });
  }

  private async ensureTracks(
    videoPath: string
  ): Promise<{ hash: string; tracks: TAudioTrackMeta[] }> {
    const { hash, entry } = this.getEntry(videoPath);
    if (entry.audioTracks) return { hash, tracks: entry.audioTracks };
    const tracks = await listAudioTracks(videoPath);
    this.updateEntry(hash, { audioTracks: tracks });
    return { hash, tracks };
  }

  // The requested track (the first one by default), with its audio converted
  private async ensureConvertedTrack(
    videoPath: string,
    trackId?: number
  ): Promise<{ hash: string; track: TAudioTrackMeta & { cache: string } }> {
    const trackedFolder = this.requireTrackedFolder();
    const { hash, tracks } = await this.ensureTracks(videoPath);
    const track = trackId === undefined ? tracks[0] : tracks.find(({ id }) => id === trackId);
    if (!track) throw new Error(`No audio track ${trackId ?? ''} in ${videoPath}`.trim());

    const dir = cacheDir(trackedFolder, 'audio');
    if (track.cache && fs.existsSync(path.join(dir, track.cache))) {
      return { hash, track: { ...track, cache: track.cache } };
    }

    const cache = fileNames.audio(hash, track.id);
    ensureDir(dir);
    await convertAudioTrack(videoPath, track, path.join(dir, cache));
    // A new conversion invalidates the waveform computed from the previous one
    this.updateTrack(hash, track.id, { cache, waveform: undefined });
    return { hash, track: { ...track, cache, waveform: undefined } };
  }
}

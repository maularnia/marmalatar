import { app, ipcMain, type IpcMainInvokeEvent } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { spawn } from 'child_process';
import type Store from 'electron-store';

// Forge's Vite plugin strips node_modules from the packaged app, so ffmpeg-static's
// JS (and its own __dirname-based path lookup) isn't available at runtime. The binary
// is copied in via packagerConfig.extraResource instead, and located relative to that.
const ffmpegBinaryName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
const ffmpegPath = app.isPackaged
  ? path.join(process.resourcesPath, 'ffmpeg-static', ffmpegBinaryName)
  : path.join(__dirname, '../../node_modules/ffmpeg-static', ffmpegBinaryName);

// Derives a cache key from path + size + mtime, avoiding a full file read/hash.
// Trade-off: a file replaced in-place with identical path/size/mtime would hit a stale cache.
function getFileCacheKey(filePath: string): string {
  const stat = fs.statSync(filePath);
  return crypto.createHash('sha1').update(`${filePath}:${stat.size}:${stat.mtimeMs}`).digest('hex');
}

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

// Extracts duration using ffmpeg's stderr output (no ffprobe needed).
// -t 1 bounds decoding to ~1s of output -- the stream-info header (which is all we read) is
// printed immediately on open regardless, so this avoids decoding the entire file just to read
// it (confirmed: ~26s for a 24-minute 1080p HEVC file without -t, ~0.1s with it).
function getDurationViaFfmpeg(filePath: string): Promise<number | null> {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, ['-i', filePath, '-t', '1', '-f', 'null', '-'], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on('close', () => {
      const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (!match) return resolve(null);
      const seconds = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
      resolve(seconds);
    });
    proc.on('error', () => resolve(null));
  });
}

// Extracts the audio codec name from ffmpeg's stream-info stderr line, e.g.
// "Stream #0:1(eng): Audio: aac (LC), 48000 Hz, stereo, fltp, 69 kb/s". Returns null if
// there's no audio stream or the line couldn't be parsed. See getDurationViaFfmpeg for why -t 1
// is used -- same reasoning, same header line is available almost instantly regardless.
function getAudioCodecViaFfmpeg(filePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, ['-i', filePath, '-t', '1', '-f', 'null', '-'], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on('close', () => {
      const match = stderr.match(
        /Stream #\d+:\d+(?:\[[^\]]*\])?(?:\([^)]*\))?:\s*Audio:\s*([a-zA-Z0-9_]+)/
      );
      resolve(match ? match[1].toLowerCase() : null);
    });
    proc.on('error', () => resolve(null));
  });
}

export function registerMediaIpc(appStore: Store): void {
  // Extracts audio waveform peaks from a video file using ffmpeg.
  // Returns number[] of ~24000 normalised [0,1] peaks.
  // Caches results in {trackedFolder}/.mrmlcache/waveforms/{key}.json.
  ipcMain.handle('extract-waveform-peaks', async (_: IpcMainInvokeEvent, filePath: string) => {
    const SAMPLE_RATE = 44100;
    const TARGET_PEAKS = 24000;

    const trackedFolder = appStore.get('trackedFolder') as string | undefined;
    let cacheFile: string | null = null;

    if (trackedFolder) {
      const key = getFileCacheKey(filePath);
      const cacheDir = path.join(trackedFolder, '.mrmlcache', 'waveforms');
      cacheFile = path.join(cacheDir, `${key}.json`);
      if (fs.existsSync(cacheFile)) {
        try {
          return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        } catch {
          /* fall through to regenerate */
        }
      }
    }

    return new Promise((resolve, reject) => {
      const proc = spawn(
        ffmpegPath,
        [
          '-i',
          filePath,
          '-vn', // skip video
          '-ac',
          '1', // mono
          '-ar',
          String(SAMPLE_RATE),
          '-f',
          's16le', // raw signed 16-bit little-endian PCM
          'pipe:1',
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );

      const chunks: Buffer[] = [];
      proc.stdout?.on('data', (chunk: Buffer) => chunks.push(chunk));
      proc.stdout?.on('error', reject);
      let stderr = '';
      proc.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0 && chunks.length === 0) {
          return reject(ffmpegError('ffmpeg waveform extraction failed', code, stderr));
        }
        const buf = Buffer.concat(chunks);
        const sampleCount = buf.length / 2; // 2 bytes per s16 sample
        const blockSize = Math.max(1, Math.floor(sampleCount / TARGET_PEAKS));
        const peaks: number[] = [];

        for (let i = 0; i < TARGET_PEAKS; i++) {
          let sum = 0;
          const start = i * blockSize;
          const end = Math.min(start + blockSize, sampleCount);
          for (let j = start; j < end; j++) {
            sum += Math.abs(buf.readInt16LE(j * 2));
          }
          peaks.push(end > start ? sum / (end - start) : 0);
        }

        const max = Math.max(...peaks, 1);
        const result = peaks.map((p) => p / max);

        if (cacheFile) {
          try {
            ensureDir(path.dirname(cacheFile));
            fs.writeFileSync(cacheFile, JSON.stringify(result), 'utf8');
          } catch {
            /* non-fatal */
          }
        }

        resolve(result);
      });

      proc.on('error', reject);
    });
  });

  // Generates a 640px-wide JPEG thumbnail at roughly 1/3 of the video duration.
  // Returns a base64 data URL string: "data:image/jpeg;base64,..."
  // Caches the JPEG in {trackedFolder}/.mrmlcache/previews/{key}.jpg.
  ipcMain.handle('generate-thumbnail', async (_: IpcMainInvokeEvent, filePath: string) => {
    const trackedFolder = appStore.get('trackedFolder') as string | undefined;
    let cacheFile: string | null = null;

    if (trackedFolder) {
      const key = getFileCacheKey(filePath);
      const cacheDir = path.join(trackedFolder, '.mrmlcache', 'previews');
      cacheFile = path.join(cacheDir, `${key}.jpg`);
      if (fs.existsSync(cacheFile)) {
        try {
          const b64 = fs.readFileSync(cacheFile).toString('base64');
          return `data:image/jpeg;base64,${b64}`;
        } catch {
          /* fall through to regenerate */
        }
      }
    }

    const duration = await getDurationViaFfmpeg(filePath);
    const seekTime = duration ? Math.max(1, duration / 3) : 5;

    return new Promise((resolve, reject) => {
      const proc = spawn(
        ffmpegPath,
        [
          '-ss',
          String(seekTime),
          '-i',
          filePath,
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
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );

      const chunks: Buffer[] = [];
      proc.stdout?.on('data', (chunk: Buffer) => chunks.push(chunk));
      proc.stdout?.on('error', reject);
      let stderr = '';
      proc.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0 && chunks.length === 0) {
          return reject(ffmpegError('ffmpeg thumbnail generation failed', code, stderr));
        }
        const buf = Buffer.concat(chunks);

        if (cacheFile) {
          try {
            ensureDir(path.dirname(cacheFile));
            fs.writeFileSync(cacheFile, buf);
          } catch {
            /* non-fatal */
          }
        }

        resolve(`data:image/jpeg;base64,${buf.toString('base64')}`);
      });

      proc.on('error', reject);
    });
  });

  // Extracts/converts a media file's audio track to AAC. If the source audio is already AAC,
  // stream-copies it (no re-encode, preserves channels/bitrate as-is); otherwise transcodes to
  // AAC Stereo 192kbps. Returns the cached file's absolute path (not inline bytes -- the
  // renderer needs a real file:// path for an <audio> element).
  // Caches the result in {trackedFolder}/.mrmlcache/audio/{key}.m4a.
  ipcMain.handle('extract-or-convert-audio', async (_: IpcMainInvokeEvent, filePath: string) => {
    const trackedFolder = appStore.get('trackedFolder') as string | undefined;
    if (!trackedFolder) {
      throw new Error('No tracked folder available to cache extracted audio');
    }

    const key = getFileCacheKey(filePath);
    const cacheDir = path.join(trackedFolder, '.mrmlcache', 'audio');
    const cacheFile = path.join(cacheDir, `${key}.m4a`);
    if (fs.existsSync(cacheFile)) {
      return cacheFile;
    }

    const codec = await getAudioCodecViaFfmpeg(filePath);
    // -map 0:a:0 explicitly selects just the first audio stream -- plain -vn only excludes
    // video. -map_chapters -1 stops chapter markers (e.g. from .mkv) from being auto-copied in
    // as a stray "Data: bin_data" text track alongside the audio (confirmed via real-world test).
    const args =
      codec === 'aac'
        ? ['-i', filePath, '-map', '0:a:0', '-map_chapters', '-1', '-c:a', 'copy', '-y', cacheFile]
        : [
            '-i',
            filePath,
            '-map',
            '0:a:0',
            '-map_chapters',
            '-1',
            '-ac',
            '2',
            '-c:a',
            'aac',
            '-b:a',
            '192k',
            '-y',
            cacheFile,
          ];

    ensureDir(cacheDir);

    return new Promise<string>((resolve, reject) => {
      const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let stderr = '';
      proc.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      proc.on('close', (code) => {
        if (code !== 0) {
          return reject(ffmpegError('ffmpeg audio extraction failed', code, stderr));
        }
        resolve(cacheFile);
      });
      proc.on('error', reject);
    });
  });
}

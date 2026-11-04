import { app } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { z } from 'zod';
import { runWithFallback } from '../../utils/runWithFallback';
import type { TAudioTrack } from '../../../bridge/definitions/audioTrack';

// Reading media file metadata with ffprobe. Nothing here decodes or writes media -- that's ffmpeg,
// in MediaService.ts.

// Same reasoning as ffmpegPath in MediaService.ts. ffprobe-static holds one binary per platform and
// arch, and electron-builder.yml copies only the current one into the packaged app.
// In development __dirname is the bundled out/main, not this source file's folder.
const ffprobeBinaryName = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
const ffprobePath = app.isPackaged
  ? path.join(process.resourcesPath, 'ffprobe-static', ffprobeBinaryName)
  : path.join(
      __dirname,
      '../../node_modules/ffprobe-static/bin',
      process.platform,
      process.arch,
      ffprobeBinaryName
    );

// Runs ffprobe and returns its JSON output, or null if it fails. Stdout is collected as Buffers,
// not strings: decoding each chunk on its own would corrupt a multi-byte character that happens to
// span two chunks.
function runFfprobe(args: string[]): Promise<unknown> {
  return new Promise((resolve) => {
    const proc = spawn(ffprobePath, ['-v', 'error', '-of', 'json', ...args], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const chunks: Buffer[] = [];
    proc.stdout?.on('data', (chunk: Buffer) => chunks.push(chunk));
    proc.on('close', (code) => {
      if (code !== 0) return resolve(null);
      resolve(runWithFallback(() => JSON.parse(Buffer.concat(chunks).toString('utf8')), null));
    });
    proc.on('error', () => resolve(null));
  });
}

const FfprobeDurationSchema = z.object({
  format: z.object({ duration: z.coerce.number() }),
});

// Duration in seconds, or null if the file has none or can't be read
export async function getDuration(filePath: string): Promise<number | null> {
  const output = await runFfprobe(['-show_entries', 'format=duration', filePath]);
  const parsed = FfprobeDurationSchema.safeParse(output);
  return parsed.success ? parsed.data.format.duration : null;
}

const FfprobeAudioStreamsSchema = z.object({
  streams: z.array(
    z.object({
      index: z.number(),
      codec_name: z.string().optional(),
      channels: z.number().optional(),
      channel_layout: z.string().optional(),
      sample_rate: z.coerce.number().optional(),
      bit_rate: z.coerce.number().optional(),
      tags: z.object({ language: z.string().optional(), title: z.string().optional() }).optional(),
      disposition: z.object({ default: z.number(), comment: z.number() }).optional(),
    })
  ),
});

// Every audio stream of the file, in file order. Rejects when ffprobe can't read the file, so
// callers can tell that apart from a file that simply has no audio.
export async function listAudioTracks(filePath: string): Promise<TAudioTrack[]> {
  const output = await runFfprobe([
    '-select_streams',
    'a',
    '-show_entries',
    'stream=index,codec_name,channels,channel_layout,sample_rate,bit_rate:stream_tags=language,title:stream_disposition=default,comment',
    filePath,
  ]);
  const parsed = FfprobeAudioStreamsSchema.safeParse(output);
  if (!parsed.success) throw new Error(`Unable to read audio tracks of ${filePath}`);
  return parsed.data.streams.map((stream) => ({
    id: stream.index,
    codec: stream.codec_name ?? null,
    channels: stream.channels ?? null,
    channelLayout: stream.channel_layout ?? null,
    sampleRate: stream.sample_rate ?? null,
    bitRate: stream.bit_rate ?? null,
    language: stream.tags?.language ?? null,
    title: stream.tags?.title ?? null,
    isDefault: stream.disposition?.default === 1,
    // Unreliable: ffprobe-static's ffprobe 4.0.2 doesn't read Matroska's commentary flag, and a
    // test .mp4 with the flag set also came out false
    isCommentary: stream.disposition?.comment === 1,
  }));
}

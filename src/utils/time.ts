import { pad } from './string';

export function timecodeToMilliseconds(timecode: string): number {
  const match = timecode.trim().match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);

  if (!match) {
    return 0;
  }

  const [, hours, minutes, seconds, milliseconds] = match;

  return (
    Number(hours) * 60 * 60 * 1000 +
    Number(minutes) * 60 * 1000 +
    Number(seconds) * 1000 +
    Number(milliseconds)
  );
}

export function msToHunanTime(milliseconds: number): string {
  const totalMilliseconds = Math.max(0, milliseconds);
  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMilliseconds % 60_000) / 1_000);
  const ms = totalMilliseconds % 1_000;

  return [pad(hours, 2), pad(minutes, 2), pad(seconds, 2)].join(':') + `,${pad(ms, 3)}`;
}

function msFromFrameCount(frameCount: number, fps: number): number {
  return (frameCount / fps) * 1000;
}
function frameCountFromMs(timeMs: number, fps: number): number {
  return Math.round((timeMs / 1000) * fps);
}

export function convertTimeByFps(timeMs: number, sourceFps: number, targetFps: number): number {
  const sourceFrames = frameCountFromMs(timeMs, sourceFps);
  return Math.round(msFromFrameCount(sourceFrames, targetFps));
}

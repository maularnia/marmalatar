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

export type TMsBreakdown = {
  hours: number;
  minutes: number;
  seconds: number;
  remainderMs: number;
};

/** Decomposes a (possibly negative/fractional) millisecond duration into whole hours/minutes/seconds
 * plus the sub-second remainder -- callers derive their own sub-second unit (ms, centiseconds,
 * frame number, ...) from `remainderMs`. */
export function breakDownMs(ms: number): TMsBreakdown {
  const safeMs = Math.max(0, ms);
  const hours = Math.floor(safeMs / 3_600_000);
  const minutes = Math.floor((safeMs % 3_600_000) / 60_000);
  const seconds = Math.floor((safeMs % 60_000) / 1_000);
  const remainderMs = safeMs % 1_000;

  return { hours, minutes, seconds, remainderMs };
}

export function msToHunanTime(milliseconds: number): string {
  const { hours, minutes, seconds, remainderMs } = breakDownMs(milliseconds);

  return [pad(hours, 2), pad(minutes, 2), pad(seconds, 2)].join(':') + `,${pad(remainderMs, 3)}`;
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

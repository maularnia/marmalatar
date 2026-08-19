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

export type TMsToTimeOptions = {
  showHours?: boolean;
  showMinutes?: boolean;
  showSeconds?: boolean;
  showMs?: boolean;
  hoursPad?: number;
  minutesPad?: number;
  secondsPad?: number;
  msPad?: number;
};

const MS_TO_TIME_DEFAULTS: Required<TMsToTimeOptions> = {
  showHours: true,
  showMinutes: true,
  showSeconds: true,
  showMs: true,
  hoursPad: 2,
  minutesPad: 2,
  secondsPad: 2,
  msPad: 3,
};

/** Formats a millisecond duration as a timecode, e.g. `HH:MM:SS,mmm` by default (the SRT
 * timecode format). Which segments appear -- and how many digits each is padded to -- are
 * configurable via `options`. */
export function msToHunanTime(milliseconds: number, options: TMsToTimeOptions = {}): string {
  const { showHours, showMinutes, showSeconds, showMs, hoursPad, minutesPad, secondsPad, msPad } = {
    ...MS_TO_TIME_DEFAULTS,
    ...options,
  };
  const { hours, minutes, seconds, remainderMs } = breakDownMs(milliseconds);

  const segments: string[] = [];
  if (showHours) segments.push(pad(hours, hoursPad));
  if (showMinutes) segments.push(pad(minutes, minutesPad));
  if (showSeconds) segments.push(pad(seconds, secondsPad));

  const time = segments.join(':');
  return showMs ? `${time},${pad(remainderMs, msPad)}` : time;
}

/** `msToHunanTime` without the sub-second remainder -- `HH:MM:SS`, for displays that want a
 * roughly fixed-width timestamp without millisecond precision. */
export function msToShortTime(milliseconds: number): string {
  return msToHunanTime(milliseconds, { showMs: false });
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

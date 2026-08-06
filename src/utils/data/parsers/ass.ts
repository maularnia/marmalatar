import { TSubtitleLine } from '@src/types';
import { parseCharacterList, serializeCharacterList } from '@utils/characters';
import { normalizeText, pad } from '@utils/string';
import { convertTimeByFps } from '@utils/time';

function parseAssTimeToMilliseconds(timecode: string): number | null {
  const match = timecode.trim().match(/^(\d+):(\d{2}):(\d{2})[.,](\d{1,2})$/);

  if (!match) {
    return null;
  }

  const [, hours, minutes, seconds, centisecondsRaw] = match;
  const centiseconds = Number(centisecondsRaw.padEnd(2, '0'));

  return (
    Number(hours) * 60 * 60 * 1000 +
    Number(minutes) * 60 * 1000 +
    Number(seconds) * 1000 +
    centiseconds * 10
  );
}

function splitAssFields(rawLine: string, expectedFieldCount: number): string[] {
  if (expectedFieldCount <= 1) {
    return [rawLine.trim()];
  }

  const values: string[] = [];
  let cursor = 0;

  for (let index = 0; index < expectedFieldCount - 1; index += 1) {
    const commaIndex = rawLine.indexOf(',', cursor);

    if (commaIndex < 0) {
      values.push(rawLine.slice(cursor).trim());

      while (values.length < expectedFieldCount) {
        values.push('');
      }

      return values;
    }

    values.push(rawLine.slice(cursor, commaIndex).trim());
    cursor = commaIndex + 1;
  }

  values.push(rawLine.slice(cursor).trim());
  return values;
}

function lineBreakAssToInternal(text: string): string {
  return text.replace(/\\[Nn]/g, '\n');
}

function lineBreakInternalToAss(text: string): string {
  return text.replace(/\n/g, '\\N');
}

function sanitizeAssText(text: string): string {
  return normalizeText(lineBreakAssToInternal(text));
}

function hasLetters(text: string): boolean {
  return /\p{L}/u.test(text);
}

export function parseAss(text: string): TSubtitleLine[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');

  let inEventsSection = false;
  let formatFields: string[] = [];
  const parsedLines: TSubtitleLine[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    if (/^\[events\]$/i.test(line)) {
      inEventsSection = true;
      continue;
    }

    if (inEventsSection && /^\[[^\]]+\]$/.test(line)) {
      break;
    }

    if (!inEventsSection) {
      continue;
    }

    if (/^format\s*:/i.test(line)) {
      formatFields = line
        .replace(/^format\s*:/i, '')
        .split(',')
        .map((field) => field.trim().toLowerCase());
      continue;
    }

    if (!/^dialogue\s*:/i.test(line) || formatFields.length === 0) {
      continue;
    }

    const payload = line.replace(/^dialogue\s*:/i, '').trim();
    const values = splitAssFields(payload, formatFields.length);

    const startIndex = formatFields.indexOf('start');
    const endIndex = formatFields.indexOf('end');
    const textIndex = formatFields.indexOf('text');
    const nameIndex = formatFields.indexOf('name');
    const actorIndex = formatFields.indexOf('actor');

    if (startIndex < 0 || endIndex < 0 || textIndex < 0) {
      continue;
    }

    const startTime = parseAssTimeToMilliseconds(values[startIndex] ?? '');
    const endTime = parseAssTimeToMilliseconds(values[endIndex] ?? '');
    const subtitleText = sanitizeAssText(values[textIndex] ?? '');
    const rawCharacter =
      nameIndex >= 0
        ? (values[nameIndex] ?? '')
        : actorIndex >= 0
          ? (values[actorIndex] ?? '')
          : '';
    const character = serializeCharacterList(parseCharacterList(rawCharacter));

    if (startTime == null || endTime == null || !subtitleText || !hasLetters(subtitleText)) {
      continue;
    }

    parsedLines.push({
      line_no: parsedLines.length + 1,
      start_time: startTime,
      end_time: endTime,
      input: subtitleText,
      output: subtitleText,
      character,
    });
  }

  return parsedLines;
}

function formatAssTimestamp(ms: number): string {
  const safeMs = Math.max(0, ms);
  const hours = Math.floor(safeMs / 3_600_000);
  const minutes = Math.floor((safeMs % 3_600_000) / 60_000);
  const seconds = Math.floor((safeMs % 60_000) / 1000);
  const centiseconds = Math.floor((safeMs % 1000) / 10);

  return `${hours}:${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(centiseconds, 2)}`;
}

export function exportAsAss(lines: TSubtitleLine[], sourceFps: number, targetFps: number): string {
  const header = [
    '[Script Info]',
    'ScriptType: v4.00+',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    'Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1',
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];

  const events = lines.map((line) => {
    const startMs = convertTimeByFps(line.start_time, sourceFps, targetFps);
    const endMs = convertTimeByFps(line.end_time, sourceFps, targetFps);

    const start = formatAssTimestamp(startMs);
    const end = formatAssTimestamp(endMs);
    const text = lineBreakInternalToAss(normalizeText(line.output));

    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
  });

  return [...header, ...events].join('\n');
}

import { TSubtitleLine } from '@src/types';
import { normalizeText } from '@utils/string';
import { convertTimeByFps, msToHunanTime, timecodeToMilliseconds } from '@utils/time';

const TIMECODE_SEPARATOR = ' --> ';

function lineBreakSrtToInternal(textLines: string[]): string {
  return textLines.join('\n');
}

function hasLetters(text: string): boolean {
  return /\p{L}/u.test(text);
}

export function parseSrt(text: string): TSubtitleLine[] {
  const normalizedText = text.replace(/\r\n/g, '\n').trim();

  if (!normalizedText) {
    return [];
  }

  const blocks = normalizedText.split(/\n{2,}/);

  return blocks
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length < 3) {
        return null;
      }

      const lineNumber = Number(lines[0]);
      const timecodeLine = lines[1];
      const textLines = lines.slice(2);

      if (!timecodeLine.includes(TIMECODE_SEPARATOR) || Number.isNaN(lineNumber)) {
        return null;
      }

      const [startTimecode, endTimecode] = timecodeLine.split(TIMECODE_SEPARATOR);
      const sanitizedText = normalizeText(lineBreakSrtToInternal(textLines));

      if (!sanitizedText || !hasLetters(sanitizedText)) {
        return null;
      }

      return {
        line_no: lineNumber,
        start_time: timecodeToMilliseconds(startTimecode),
        end_time: timecodeToMilliseconds(endTimecode),
        input: sanitizedText,
        output: sanitizedText,
        character: '',
      } satisfies TSubtitleLine;
    })
    .filter((line) => line !== null)
    .map((line, index) => {
      return {
        ...line,
        line_no: index + 1,
      };
    });
}

export function exportAsSrt(lines: TSubtitleLine[], sourceFps: number, targetFps: number): string {
  return lines
    .map((line, index) => {
      const startMs = convertTimeByFps(line.start_time, sourceFps, targetFps);
      const endMs = convertTimeByFps(line.end_time, sourceFps, targetFps);
      const text = normalizeText(line.output);

      return [`${index + 1}`, `${msToHunanTime(startMs)} --> ${msToHunanTime(endMs)}`, text].join(
        '\n'
      );
    })
    .join('\n\n');
}

import { TSubtitleLine } from '@src/types';
import { normalizeText, pad } from '@utils/string';
import { breakDownMs, convertTimeByFps } from '@utils/time';

export const DEFAULT_CSV_COLUMN_FORMULA =
  '{line_number},{start_time},{end_time},{character},{text}';
export const DEFAULT_CSV_TIME_FORMAT = '{hh}:{mm}:{ss}:{ff}';

function escapeCsvValue(value: string): string {
  if (/["\n,]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function formatCsvTime(ms: number, fps: number, format: string): string {
  const safeMs = Math.max(0, Math.round(ms));
  const { hours, minutes, seconds, remainderMs } = breakDownMs(safeMs);
  const framesInSecond = Math.max(1, Math.round(fps));
  const frame = Math.min(framesInSecond - 1, Math.floor((remainderMs / 1000) * fps));

  return (
    format
      .replace(/\{hh\}/g, pad(hours, 2))
      .replace(/\{mm\}/g, pad(minutes, 2))
      .replace(/\{ss\}/g, pad(seconds, 2))
      .replace(/\{ff\}/g, pad(frame, 2))
      // Optional alias because users may type either token for milliseconds.
      .replace(/\{mmm\}/g, pad(remainderMs, 3))
      .replace(/\{ms\}/g, pad(remainderMs, 3))
      .replace(/\{abs_ms\}/g, String(safeMs))
  );
}

function applyCsvFormula(template: string, values: Record<string, string>): string {
  return template.replace(
    /\{(line_number|start_time|end_time|character|text|completed)\}/g,
    (match) => {
      return values[match] ?? match;
    }
  );
}

export function exportAsCsv(
  lines: TSubtitleLine[],
  sourceFps: number,
  targetFps: number,
  columnFormula: string = DEFAULT_CSV_COLUMN_FORMULA,
  timeFormat: string = DEFAULT_CSV_TIME_FORMAT
): string {
  const resolvedFormula = columnFormula.trim() || DEFAULT_CSV_COLUMN_FORMULA;
  const formulaParts = resolvedFormula.split(',').map((part) => part.trim());
  const header = formulaParts.map((part) => part || '');

  const rows = lines.map((line) => {
    const startMs = convertTimeByFps(line.start_time, sourceFps, targetFps);
    const endMs = convertTimeByFps(line.end_time, sourceFps, targetFps);
    const values: Record<string, string> = {
      '{line_number}': String(line.line_no),
      '{start_time}': formatCsvTime(startMs, targetFps, timeFormat),
      '{end_time}': formatCsvTime(endMs, targetFps, timeFormat),
      '{character}': line.character ?? '',
      '{text}': normalizeText(line.output),
      '{completed}': String(Boolean(line.completed)),
    };

    return formulaParts.map((part) => escapeCsvValue(applyCsvFormula(part, values))).join(',');
  });

  return [header.join(','), ...rows].join('\n');
}

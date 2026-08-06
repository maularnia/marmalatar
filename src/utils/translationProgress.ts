import type { TSubtitleLine } from '@src/types';

export function computeTranslationProgress(lines: TSubtitleLine[]): number {
  if (!lines.length) return 0;
  return (lines.filter((l) => Boolean(l.completed)).length / lines.length) * 100;
}

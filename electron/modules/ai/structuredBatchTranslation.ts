export function buildStructuredBatchUserMessage(
  lines: Array<{ line: number; text: string }>
): string {
  return lines.map(({ line, text }) => `[${line}] ${text}`).join('\n');
}

export function buildStructuredBatchInstructions(): string {
  return [
    'You will receive multiple subtitle lines, each prefixed with its line number in brackets, e.g. "[3] Hello".',
    'Translate each line independently.',
    'Respond with a JSON object matching the required schema: one entry per input line, with the exact same line number, in any order.',
    'Do not merge, skip, split, or reorder lines. Do not include any text outside the JSON object.',
  ].join(' ');
}

export function parseStructuredBatchResponse(raw: string): Map<number, string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Model did not return valid structured output (not valid JSON).');
  }
  const translations = (parsed as { translations?: unknown } | null)?.translations;
  if (!Array.isArray(translations)) {
    throw new Error('Model did not return valid structured output (missing "translations" array).');
  }
  const map = new Map<number, string>();
  for (const item of translations) {
    if (
      item &&
      typeof item === 'object' &&
      typeof (item as { line?: unknown }).line === 'number' &&
      typeof (item as { text?: unknown }).text === 'string'
    ) {
      map.set((item as { line: number }).line, (item as { text: string }).text.trim());
    }
  }
  return map;
}

export function computeStructuredMaxTokens(lineCount: number, contextLength?: number): number {
  const estimate = 64 + lineCount * 120;
  if (!contextLength) return estimate;
  return Math.min(estimate, Math.floor(contextLength / 2));
}

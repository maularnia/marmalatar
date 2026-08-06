export function parseCharacterList(rawValue?: string): string[] {
  if (!rawValue) {
    return [];
  }

  const seen = new Set<string>();
  const values = rawValue
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .filter((value) => {
      if (seen.has(value)) {
        return false;
      }

      seen.add(value);
      return true;
    });

  return values;
}

export function serializeCharacterList(values: string[]): string {
  return values
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join(', ');
}

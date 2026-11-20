import type { z } from 'zod';

// Picks the valid entries out of a version 0 record (e.g. folderScanCache.projects), in stored
// order. A broken entry is skipped rather than failing the whole migration.
export function readLegacyEntries<TSchema extends z.ZodType>(
  raw: unknown,
  schema: TSchema
): z.infer<TSchema>[] {
  if (!raw || typeof raw !== 'object') return [];
  return Object.values(raw).flatMap((value) => {
    const parsed = schema.safeParse(value);
    return parsed.success ? [parsed.data as z.infer<TSchema>] : [];
  });
}

import fs from 'fs';
import type { z } from 'zod';
import { runWithFallback } from './runWithFallback';

// Reads and validates a JSON file. null if it's missing, unreadable, not JSON or doesn't match.
export function readJsonFile<TSchema extends z.ZodType>(
  filePath: string,
  schema: TSchema
): z.infer<TSchema> | null {
  return runWithFallback(
    () => schema.parse(JSON.parse(fs.readFileSync(filePath, 'utf8'))) as z.infer<TSchema>,
    null
  );
}

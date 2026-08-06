import { z } from 'zod';
import { VersionedSchema } from './shared';

export const PromptTemplateCacheEntryV1Schema = VersionedSchema.extend({
  version: z.literal(1).default(1),
  fileName: z.string(),
  title: z.string(),
  emoji: z.string(),
});
export type PromptTemplateCacheEntry = z.infer<typeof PromptTemplateCacheEntryV1Schema>;

// Version config (defineVersionedContract) and the reader built from it live in
// contracts.ts, alongside every other contract's.

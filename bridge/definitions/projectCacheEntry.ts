import { z } from 'zod';
import { VersionedSchema } from './shared';

// Lightweight, persisted folder-scan cache entry for one project: everything the Main Menu list
// needs to render (name/emoji/progress) without reading the .mrml file's content from disc.
export const ProjectCacheEntryV1Schema = VersionedSchema.extend({
  version: z.literal(1).default(1),
  filePath: z.string(),
  fileName: z.string(),
  translationProgress: z.number().catch(0),
  project: z.object({
    projectId: z.string(),
    projectName: z.string(),
    emoji: z.string(),
  }),
});
export type ProjectCacheEntry = z.infer<typeof ProjectCacheEntryV1Schema>;

// Version config (defineVersionedContract) and the reader built from it live in
// contracts.ts, alongside every other contract's.

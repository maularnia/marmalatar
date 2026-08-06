import { z } from 'zod';
import { VersionedSchema } from './shared';
import { ProjectCacheEntryV1Schema } from './projectCacheEntry';
import { PromptTemplateCacheEntryV1Schema } from './promptTemplateCacheEntry';
import { GlossaryCacheEntryContractV1Schema } from './glossaryCacheEntry';

// Root of the folder-scan cache: everything the Main Menu list needs to render without reading
// any project/prompt-template/glossary file content from disc. Records are keyed by filePath
// (projects) / fileName (promptTemplates, glossaries).
export const FolderScanResultV1Schema = VersionedSchema.extend({
  version: z.literal(1).default(1),
  folder: z.string(),
  scannedAt: z.number(),
  projects: z.record(z.string(), ProjectCacheEntryV1Schema).catch({}),
  promptTemplates: z.record(z.string(), PromptTemplateCacheEntryV1Schema).catch({}),
  glossaries: z.record(z.string(), GlossaryCacheEntryContractV1Schema).catch({}),
});
export type FolderScanResult = z.infer<typeof FolderScanResultV1Schema>;

// Version config (defineVersionedContract) and the reader built from it live in
// contracts.ts, alongside every other contract's.

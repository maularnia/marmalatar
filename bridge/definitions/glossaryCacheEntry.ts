import { z } from 'zod';
import { VersionedSchema } from './shared';

// sourceLanguage/targetLanguage are plain strings here — the FE narrows them to its
// LanguageCodeSchema (TLanguage enum) via `.extend()` in src/utils/data/schemas.ts, since that
// enum is an FE-only concern that must not be imported into this neutral folder.
export const GlossaryCacheEntryContractV1Schema = VersionedSchema.extend({
  version: z.literal(1).default(1),
  fileName: z.string(),
  title: z.string(),
  emoji: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
});
export type GlossaryCacheEntryContract = z.infer<typeof GlossaryCacheEntryContractV1Schema>;

// Version config (defineVersionedContract) and the reader built from it live in
// contracts.ts, alongside every other contract's.

import { z } from 'zod';

// Shared by lmStudio.ts and deepl.ts — one subtitle line to translate.
export const BatchLineSchema = z.object({
  line: z.number(),
  text: z.string(),
});
export type BatchLine = z.infer<typeof BatchLineSchema>;

// Base for every persisted contract schema (electron-store entries, folder-scan-cache entries) --
// concrete schemas extend this with `version: z.literal(N).default(N)` and are named e.g.
// `FooV1Schema`. Having a plain-number version tag on each persisted shape up front means a future
// breaking format change can add a `FooV2Schema` and branch on `version` to migrate old data,
// instead of needing to guess the shape of whatever's already on disk.
export const VersionedSchema = z.object({
  version: z.number(),
});

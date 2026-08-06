import { z } from 'zod';
import { VersionedSchema } from './shared';

// Wire shape for Ollama's per-integration settings (see src/services/ai/Ollama/ollamaClient.ts's
// OllamaSettingKey). `.catch('')` per field rather than duplicating this integration's meaningful
// defaults (which live in FE-only src/services/ai/Ollama/consts.ts and must not be imported into
// this neutral folder) -- every consumer of these settings already treats '' as "not set, use my
// own fallback" (see resolveContextLength/resolveBatchSize), except `endpoint`, which has no such
// fallback today (pre-existing FE gap, not introduced by this contract).
export const OllamaSettingsV1Schema = VersionedSchema.extend({
  version: z.literal(1).default(1),
  endpoint: z.string().catch(''),
  model: z.string().catch(''),
  context_length: z.string().catch(''),
  lines_per_request: z.string().catch(''),
});
export type OllamaSettings = z.infer<typeof OllamaSettingsV1Schema>;

// Version config (defineVersionedContract) and the reader built from it live in
// contracts.ts, alongside every other contract's.

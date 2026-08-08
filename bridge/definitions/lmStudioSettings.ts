import { z } from 'zod';
import { VersionedSchema } from './shared';

// Wire shape for LM Studio's per-integration settings (see
// src/services/ai/LMStudio/lmStudioClient.ts's LMStudioSettingKey). `.catch('')` per field for the
// same reason as OllamaSettingsV1Schema -- resolveContextLength/resolveReasoningTags/
// resolveBatchSize in lmStudioClient.ts already treat an empty string as "not set", except
// `endpoint`, which has no such fallback today (pre-existing FE gap, not introduced by this
// contract).
export const LMStudioSettingsV1Schema = VersionedSchema.extend({
  version: z.literal(1).default(1),
  endpoint: z.string().catch(''),
  model: z.string().catch(''),
  context_length: z.string().catch(''),
  reasoning_start_tag: z.string().catch(''),
  reasoning_end_tag: z.string().catch(''),
  lines_per_request: z.string().catch(''),
});

// Version config (defineVersionedContract) and the reader built from it live in
// contracts.ts, alongside every other contract's.

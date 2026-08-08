import { z } from 'zod';
import { VersionedSchema } from './shared';

// Wire shape for the DeepL settings that flow through the generic per-integration channel (see
// src/services/ai/DeepL/deeplClient.ts's DeepLSettingKey). Deliberately excludes `api_key`, which
// DeepLClient splits off and persists through its own dedicated safeStorage-backed channel
// (setDeepLApiKey/getDeepLApiKey, a separate electron-store key) -- untouched by this contract.
// `.catch('')` per field for the same reason as the other two providers -- deeplClient.ts's
// resolveFormality/model_type-fallback/resolveGlossaryId/resolveBatchSize all already treat an
// empty string as "not set" (glossary_id's own meaningful default, DEEPL_NO_GLOSSARY_VALUE, is
// literally '' already, so this is an exact match).
export const DeepLSettingsV1Schema = VersionedSchema.extend({
  version: z.literal(1).default(1),
  formality: z.string().catch(''),
  model_type: z.string().catch(''),
  lines_per_request: z.string().catch(''),
  glossary_id: z.string().catch(''),
});

// Version config (defineVersionedContract) and the reader built from it live in
// contracts.ts, alongside every other contract's.

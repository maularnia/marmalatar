import { z } from 'zod';
import { BatchLineSchema } from './shared';

export const LMStudioTranslationParamsSchema = z.object({
  requestId: z.string(),
  host: z.string(),
  model: z.string(),
  lines: z.array(BatchLineSchema),
  systemPrompt: z.string(),
  contextLength: z.number().optional(),
  reasoningStartTag: z.string().optional(),
  reasoningEndTag: z.string().optional(),
  // Generated FE-side (see src/services/ai/config.ts's BATCH_TRANSLATION_JSON_SCHEMA), only used
  // when lines.length > 1 -- a plain, IPC-serializable JSON schema object.
  jsonSchema: z.record(z.string(), z.unknown()),
});
export type LMStudioTranslationParams = z.infer<typeof LMStudioTranslationParamsSchema>;

export const LMStudioTranslationResultSchema = z.array(BatchLineSchema);
export type LMStudioTranslationResult = z.infer<typeof LMStudioTranslationResultSchema>;

export const TokenizeWithLMStudioParamsSchema = z.object({
  host: z.string(),
  model: z.string(),
  text: z.string(),
});
export type TokenizeWithLMStudioParams = z.infer<typeof TokenizeWithLMStudioParamsSchema>;

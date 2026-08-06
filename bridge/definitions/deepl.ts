import { z } from 'zod';
import { BatchLineSchema } from './shared';

// sourceLang/targetLang/formality/modelType are plain strings here (not deepl-node's literal
// union types) -- electron/modules/ai/deepl.ts casts them to the deepl-node SDK's types at the
// point it calls the SDK, keeping the deepl-node dependency out of this shared, neutral folder.
export const DeepLTranslationParamsSchema = z.object({
  apiKey: z.string(),
  sourceLang: z.string(),
  targetLang: z.string(),
  lines: z.array(BatchLineSchema),
  formality: z.string().optional(),
  modelType: z.string().optional(),
  glossaryId: z.string().optional(),
});
export type DeepLTranslationParams = z.infer<typeof DeepLTranslationParamsSchema>;

export const DeepLTranslationResultSchema = z.array(BatchLineSchema);
export type DeepLTranslationResult = z.infer<typeof DeepLTranslationResultSchema>;

export const DeepLGlossaryOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});
export type DeepLGlossaryOption = z.infer<typeof DeepLGlossaryOptionSchema>;

export const DeepLGlossaryOptionListSchema = z.array(DeepLGlossaryOptionSchema);

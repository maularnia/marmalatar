import { z } from 'zod';

// The part of a .mrmlpt file only the prompt template service writes
export const PromptTemplateFileHeaderSchema = z.object({
  version: z.literal(1).default(1),
  title: z.string(),
  emoji: z.string(),
});
type TPromptTemplateFileHeader = z.infer<typeof PromptTemplateFileHeaderSchema>;

// The part of a .mrmlpt file the renderer writes
export const PromptTemplateFileBodySchema = z.object({
  promptTemplate: z.string().optional(),
});
export type TPromptTemplateFileBody = z.infer<typeof PromptTemplateFileBodySchema>;

// What a new prompt template's header starts from
export type TPromptTemplateCreateInput = Omit<TPromptTemplateFileHeader, 'version'>;

export type TPromptTemplateListEntry = Omit<TPromptTemplateFileHeader, 'version'> & {
  fileName: string;
  filePath: string;
};

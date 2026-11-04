import { z } from 'zod';

// The part of a .mrmlpt file the prompt template list needs
export const PromptTemplateFileHeaderSchema = z.object({
  version: z.literal(1).default(1),
  title: z.string(),
  emoji: z.string(),
});

export type TPromptTemplateListEntry = {
  fileName: string;
  filePath: string;
  title: string;
  emoji: string;
};

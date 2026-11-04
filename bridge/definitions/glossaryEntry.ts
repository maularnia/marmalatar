import { z } from 'zod';

// The part of a .mrmlg file the glossary list needs. Languages are plain strings here: the
// renderer narrows them to its TLanguage enum, which must not be imported into the bridge.
export const GlossaryFileHeaderSchema = z.object({
  version: z.literal(1).default(1),
  title: z.string(),
  emoji: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
});

export type TGlossaryListEntry = {
  fileName: string;
  filePath: string;
  title: string;
  emoji: string;
  sourceLanguage: string;
  targetLanguage: string;
};

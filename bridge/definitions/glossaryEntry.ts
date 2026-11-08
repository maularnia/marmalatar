import { z } from 'zod';

// The part of a .mrmlg file only the glossary service writes. Languages are plain strings here:
// the renderer narrows them to its TLanguage enum, which must not be imported into the bridge.
export const GlossaryFileHeaderSchema = z.object({
  version: z.literal(1).default(1),
  title: z.string(),
  emoji: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
});
type TGlossaryFileHeader = z.infer<typeof GlossaryFileHeaderSchema>;

export const GlossaryPairSchema = z.object({
  original: z.string(),
  translation: z.string(),
});

// The part of a .mrmlg file the renderer writes
export const GlossaryFileBodySchema = z.object({
  list: z.array(GlossaryPairSchema),
});
export type TGlossaryFileBody = z.infer<typeof GlossaryFileBodySchema>;

// What a new glossary's header starts from
export type TGlossaryCreateInput = Omit<TGlossaryFileHeader, 'version'>;

export type TGlossaryListEntry = Omit<TGlossaryFileHeader, 'version'> & {
  fileName: string;
  filePath: string;
};

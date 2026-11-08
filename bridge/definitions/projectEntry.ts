import { z } from 'zod';

// One subtitle line as stored in a .mrml file
export const ProjectLineSchema = z.object({
  line_no: z.number(),
  start_time: z.number(),
  end_time: z.number(),
  input: z.string(),
  output: z.string(),
  character: z.string().optional(),
  completed: z.boolean().optional(),
});

// The part of a .mrml file only the project service writes. Languages are plain strings here: the
// renderer narrows them to its TLanguage enum, which must not be imported into the bridge. They
// stay in the file, so they travel with it to another device.
export const ProjectFileHeaderSchema = z.object({
  version: z.literal(1).default(1),
  project: z.object({
    projectId: z.string(),
    projectName: z.string(),
    emoji: z.string(),
    sourceLanguage: z.string(),
    targetLanguage: z.string(),
  }),
});
export type TProjectFileHeader = z.infer<typeof ProjectFileHeaderSchema>;

// The part of a .mrml file the renderer writes. Character colors are left loose: the renderer
// narrows them to its theme colors.
export const ProjectFileBodySchema = z.object({
  editor: z.object({
    lines: z.array(ProjectLineSchema),
    characterPool: z.array(z.object({ name: z.string(), color: z.string() })),
  }),
});
export type TProjectFileBody = z.infer<typeof ProjectFileBodySchema>;

// What a new project's header starts from. The project service assigns the projectId.
export type TProjectCreateInput = Omit<TProjectFileHeader['project'], 'projectId'>;

// One project in the list the project service returns, sorted by `order`
export type TProjectListEntry = TProjectFileHeader['project'] & {
  fileName: string;
  filePath: string;
  // Share of completed lines, 0..100, computed by the project service whenever it reads the file
  translationProgress: number;
  order: number;
  hidden: boolean;
};

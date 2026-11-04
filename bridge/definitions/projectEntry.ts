import { z } from 'zod';

// The part of a .mrml file the project list needs. Lines aren't validated here: the renderer
// parses the whole file when the project is opened.
export const ProjectFileHeaderSchema = z.object({
  version: z.literal(1).default(1),
  project: z.object({
    projectId: z.string(),
    projectName: z.string(),
    emoji: z.string(),
  }),
});

// One project in the list the project service returns, sorted by `order`
export type TProjectListEntry = {
  projectId: string;
  fileName: string;
  filePath: string;
  projectName: string;
  emoji: string;
  translationProgress: number;
  order: number;
  hidden: boolean;
};

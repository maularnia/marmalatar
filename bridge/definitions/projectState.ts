import { z } from 'zod';
import { VersionedSchema } from './shared';

// Device-specific editor/UI preferences for a project, persisted in electron-store keyed by
// projectId instead of in the .mrml file (they aren't project content). Wire shape only — no
// FE-only enums live here.
export const ProjectStateV1Schema = VersionedSchema.extend({
  version: z.literal(1).default(1),
  editorMode: z.enum(['edit', 'translate']).catch('translate'),
  isVideoCollapsed: z.boolean().catch(false),
  videoPath: z.string().nullable().catch(null),
});
export type ProjectState = z.infer<typeof ProjectStateV1Schema>;

// Version config (defineVersionedContract) and the reader built from it live in
// contracts.ts, alongside every other contract's.

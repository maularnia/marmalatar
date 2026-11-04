import { z } from 'zod';
import { VersionedSchema } from './shared';

// Device-specific data for a project, persisted in electron-store keyed by projectId instead of in
// the .mrml file (it isn't project content): editor/UI preferences, and since V2 the progress
// computed from the file. Wire shape only — no FE-only enums live here.
export const ProjectStateV1Schema = VersionedSchema.extend({
  version: z.literal(1).default(1),
  editorMode: z.enum(['edit', 'translate']).catch('translate'),
  isVideoCollapsed: z.boolean().catch(false),
  videoPath: z.string().nullable().catch(null),
});

// Adds the translation progress, computed by the project service from the file's lines (the
// renderer reads it but never writes it), and the audio track played with the video: ffprobe's
// stream index, null when no track is chosen yet.
export const ProjectStateV2Schema = ProjectStateV1Schema.extend({
  version: z.literal(2).default(2),
  translationProgress: z.number().catch(0),
  audioTrackId: z.number().int().nullable().catch(null),
});
export type ProjectState = z.infer<typeof ProjectStateV2Schema>;

// What the renderer may write: its own preferences, never the computed fields
export type TProjectStatePrefs = Pick<
  ProjectState,
  'editorMode' | 'isVideoCollapsed' | 'videoPath' | 'audioTrackId'
>;

// Version config (defineVersionedContract) and the reader built from it live in
// contracts.ts, alongside every other contract's.

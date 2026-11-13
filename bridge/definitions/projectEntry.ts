import { z } from 'zod';
import { ProjectSpellcheckSchema } from './spellcheckDictionary';

// The .mrml format the project service writes. Version 2 added the `spellcheck` property and the
// `tempo` block; version 1 files are still read (the renderer's contract upgrades them) and written
// as version 2 next time.
export const PROJECT_FILE_VERSION = 2;

// The project's subtitle limits, checked line by line in the editor while `enabled`. The two
// neighbour rules came later, so they default per field: files saved before them hold a `tempo`
// without those keys, which the object-level default elsewhere doesn't cover.
export const ProjectTempoSchema = z.object({
  enabled: z.boolean(),
  maxLinesPerEntry: z.number().int().min(1),
  maxCharsPerLine: z.number().int().min(1),
  minDurationMs: z.number().int().min(1),
  // The gap required between consecutive entries, in frames (at the assumed 23.976 fps)
  minIntervalFrames: z.number().int().min(1).default(2),
  // Whether entries overlapping in time are marked
  highlightOverlaps: z.boolean().default(true),
});
export type TProjectTempo = z.infer<typeof ProjectTempoSchema>;

// Netflix's general limits: 2 lines of 42 characters, 5/6 of a second on screen, 2 frames between
// entries, no overlaps. Off until the user switches the check on for a project, so existing
// projects don't light up on upgrade.
export const PROJECT_TEMPO_DEFAULTS: TProjectTempo = {
  enabled: false,
  maxLinesPerEntry: 2,
  maxCharsPerLine: 42,
  minDurationMs: 833,
  minIntervalFrames: 2,
  highlightOverlaps: true,
};

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
  // Any version: listing reads files of every version, the renderer's contract checks it on open
  version: z.number().default(PROJECT_FILE_VERSION),
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
// narrows them to its theme colors. `tempo` defaults here because the project service re-parses
// the body of files written before it existed (dictionary and header rewrites).
export const ProjectFileBodySchema = z.object({
  editor: z.object({
    lines: z.array(ProjectLineSchema),
    characterPool: z.array(z.object({ name: z.string(), color: z.string() })),
  }),
  tempo: ProjectTempoSchema.default(PROJECT_TEMPO_DEFAULTS),
});
export type TProjectFileBody = z.infer<typeof ProjectFileBodySchema>;

// The project's own spellcheck dictionary. Written only by the project service (add-to-dictionary);
// a file without it (version 1) has none.
export const ProjectFileSpellcheckSchema = z.object({
  spellcheck: ProjectSpellcheckSchema.catch({}).default({}),
});

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

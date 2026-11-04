import { z } from 'zod';
import { TLanguage } from '@src/types';
import { ThemeColors } from '@src/theme/utils';
import { defineVersionedContract, createVersionedReader } from '@bridge/versioning';
import { ProjectStateV1Schema } from '@bridge/definitions/projectState';
import type { TGlossaryListEntry } from '@bridge/definitions/glossaryEntry';

const LanguageCodeSchema = z.enum(Object.values(TLanguage) as [TLanguage, ...TLanguage[]]);

const PromptTemplateFileV1Schema = z.object({
  version: z.literal(1).default(1),
  title: z.string(),
  emoji: z.string(),
  promptTemplate: z.string().optional(),
});
export type PromptTemplateFileDataType = z.infer<typeof PromptTemplateFileV1Schema>;

const PromptTemplateFileVersioning = defineVersionedContract({
  name: 'PromptTemplateFile',
  minSupportedVersion: 1,
  currentVersion: 1,
  schemas: { 1: PromptTemplateFileV1Schema },
  transforms: {},
  current: PromptTemplateFileV1Schema,
});
export const readPromptTemplateFileContract = createVersionedReader(PromptTemplateFileVersioning);

const AIGlossaryEntrySchema = z.object({
  original: z.string(),
  translation: z.string(),
});

const AIGlossaryFileV1Schema = z.object({
  version: z.literal(1).default(1),
  title: z.string(),
  emoji: z.string(),
  sourceLanguage: LanguageCodeSchema,
  targetLanguage: LanguageCodeSchema,
  list: z.array(AIGlossaryEntrySchema),
});
export type AIGlossaryFileDataType = z.infer<typeof AIGlossaryFileV1Schema>;

const AIGlossaryFileVersioning = defineVersionedContract({
  name: 'AIGlossaryFile',
  minSupportedVersion: 1,
  currentVersion: 1,
  schemas: { 1: AIGlossaryFileV1Schema },
  transforms: {},
  current: AIGlossaryFileV1Schema,
});
export const readGlossaryFileContract = createVersionedReader(AIGlossaryFileVersioning);

const TranslationLineSchema = z.object({
  line_no: z.number(),
  start_time: z.number(),
  end_time: z.number(),
  input: z.string(),
  output: z.string(),
  character: z.string().optional(),
  completed: z.boolean().optional(),
});

const CharacterPoolItemSchema = z.object({
  name: z.string(),
  color: z.enum(ThemeColors),
});

// The file mirrors the store directly: `project`/`editor` sections match the
// `project`/`editor` redux slices 1:1 (only the subset of each slice that's
// actual project content, not session/device-specific UI state).
export const ProjectSaveV1Schema = z.object({
  version: z.literal(1).default(1),
  project: z.object({
    projectId: z.string(),
    projectName: z.string().min(1, 'Project name is required.'),
    emoji: z.string(),
    sourceLanguage: LanguageCodeSchema,
    targetLanguage: LanguageCodeSchema,
  }),
  editor: z.object({
    lines: z.array(TranslationLineSchema),
    characterPool: z.array(CharacterPoolItemSchema),
  }),
});

export type TProjectFileData = z.infer<typeof ProjectSaveV1Schema>;

const ProjectSaveVersioning = defineVersionedContract({
  name: 'ProjectSave',
  minSupportedVersion: 1,
  currentVersion: 1,
  schemas: { 1: ProjectSaveV1Schema },
  transforms: {},
  current: ProjectSaveV1Schema,
});
export const readProjectSaveFile = createVersionedReader(ProjectSaveVersioning);

// Device-specific editor/UI preferences for a project, persisted in electron-store
// keyed by projectId instead of in the .mrml file (they aren't project content).
// Re-exported from the shared bridge contract as-is -- no FE-only enums involved.
export const ProjectEditorStateSchema = ProjectStateV1Schema;

export type TProjectEditorState = z.infer<typeof ProjectEditorStateSchema>;

// Narrows the glossary list entry's loose sourceLanguage/targetLanguage (plain strings) to this
// app's TLanguage enum
export const GlossaryListEntrySchema = z.object({
  fileName: z.string(),
  filePath: z.string(),
  title: z.string(),
  emoji: z.string(),
  sourceLanguage: LanguageCodeSchema,
  targetLanguage: LanguageCodeSchema,
}) satisfies z.ZodType<TGlossaryListEntry>;
export type TGlossaryEntry = z.infer<typeof GlossaryListEntrySchema>;

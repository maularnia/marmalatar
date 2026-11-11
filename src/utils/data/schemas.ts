import { z } from 'zod';
import { TLanguage } from '@src/types';
import { ThemeColors } from '@src/theme/utils';
import { defineVersionedContract, createVersionedReader } from '@bridge/versioning';
import { ProjectStateV2Schema } from '@bridge/definitions/projectState';
import {
  GlossaryFileHeaderSchema,
  GlossaryPairSchema,
  type TGlossaryListEntry,
} from '@bridge/definitions/glossaryEntry';
import {
  ProjectFileBodySchema,
  ProjectFileHeaderSchema,
  ProjectLineSchema,
} from '@bridge/definitions/projectEntry';
import { ProjectSpellcheckSchema } from '@bridge/definitions/spellcheckDictionary';
import {
  PromptTemplateFileBodySchema,
  PromptTemplateFileHeaderSchema,
} from '@bridge/definitions/promptTemplateEntry';

const LanguageCodeSchema = z.enum(Object.values(TLanguage) as [TLanguage, ...TLanguage[]]);

// File schemas are composed from the bridge's header and body schemas, with values only this app
// knows (languages, theme colors) narrowed
const PromptTemplateFileV1Schema = PromptTemplateFileHeaderSchema.merge(
  PromptTemplateFileBodySchema
);
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

const AIGlossaryFileV1Schema = GlossaryFileHeaderSchema.extend({
  sourceLanguage: LanguageCodeSchema,
  targetLanguage: LanguageCodeSchema,
  list: z.array(GlossaryPairSchema),
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

const CharacterPoolItemSchema = z.object({
  name: z.string(),
  color: z.enum(ThemeColors),
});

// The file mirrors the store directly: `project`/`editor` sections match the
// `project`/`editor` redux slices 1:1 (only the subset of each slice that's
// actual project content, not session/device-specific UI state).
const ProjectSaveV1Schema = ProjectFileHeaderSchema.extend({
  version: z.literal(1),
  project: ProjectFileHeaderSchema.shape.project.extend({
    projectName: z.string().min(1, 'Project name is required.'),
    sourceLanguage: LanguageCodeSchema,
    targetLanguage: LanguageCodeSchema,
  }),
  editor: ProjectFileBodySchema.shape.editor.extend({
    lines: z.array(ProjectLineSchema),
    characterPool: z.array(CharacterPoolItemSchema),
  }),
});

// Version 2 adds the project's own spellcheck dictionary, per language code. The project service
// writes it (projects.addToDictionary); the renderer only reads it.
const ProjectSaveV2Schema = ProjectSaveV1Schema.extend({
  version: z.literal(2),
  spellcheck: ProjectSpellcheckSchema,
});

// The current file format
export const ProjectSaveSchema = ProjectSaveV2Schema;

// The part of the file the renderer writes; the project service owns the rest
export type TProjectFileBody = Pick<TProjectFileData, 'editor'>;

export type TProjectFileData = z.infer<typeof ProjectSaveV2Schema>;

const ProjectSaveVersioning = defineVersionedContract({
  name: 'ProjectSave',
  minSupportedVersion: 1,
  currentVersion: 2,
  schemas: { 1: ProjectSaveV1Schema, 2: ProjectSaveV2Schema },
  transforms: {
    // A file from before spellcheck dictionaries: an empty one. The project service writes it out
    // as version 2 the next time it saves the file.
    1: (data) => ({ ...(data as object), version: 2, spellcheck: {} }),
  },
  current: ProjectSaveV2Schema,
});
export const readProjectSaveFile = createVersionedReader(ProjectSaveVersioning);

// Device-specific data for a project, persisted in electron-store keyed by projectId instead of in
// the .mrml file (it isn't project content). Re-exported from the shared bridge contract as-is --
// no FE-only enums involved. The renderer writes only the preferences in it, see
// TProjectStatePrefs.
export const ProjectEditorStateSchema = ProjectStateV2Schema;

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

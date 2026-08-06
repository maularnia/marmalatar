import { z } from 'zod';
import { TLanguage } from '@src/types';
import { ThemeColors } from '@src/theme/utils';
import { defineVersionedContract, createVersionedReader } from '@bridge/versioning';
import { ProjectStateV1Schema } from '@bridge/definitions/projectState';
import { ProjectCacheEntryV1Schema as ProjectCacheEntryContractSchema } from '@bridge/definitions/projectCacheEntry';
import { PromptTemplateCacheEntryV1Schema as PromptTemplateCacheEntryContractSchema } from '@bridge/definitions/promptTemplateCacheEntry';
import { GlossaryCacheEntryContractV1Schema } from '@bridge/definitions/glossaryCacheEntry';

const LanguageCodeSchema = z.enum(Object.values(TLanguage) as [TLanguage, ...TLanguage[]]);

export const PromptTemplateFileV1Schema = z.object({
  version: z.literal(1).default(1),
  title: z.string(),
  emoji: z.string(),
  promptTemplate: z.string().optional(),
});
export type PromptTemplateFileDataType = z.infer<typeof PromptTemplateFileV1Schema>;

export const PromptTemplateFileVersioning = defineVersionedContract({
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

export const AIGlossaryFileV1Schema = z.object({
  version: z.literal(1).default(1),
  title: z.string(),
  emoji: z.string(),
  sourceLanguage: LanguageCodeSchema,
  targetLanguage: LanguageCodeSchema,
  list: z.array(AIGlossaryEntrySchema),
});
export type AIGlossaryFileDataType = z.infer<typeof AIGlossaryFileV1Schema>;

export const AIGlossaryFileVersioning = defineVersionedContract({
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

export const ProjectSaveVersioning = defineVersionedContract({
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

// Lightweight, persisted folder-scan cache: everything the Main Menu list needs to
// render (name/emoji/progress) without reading any project/prompt-template/glossary
// file content from disc. Kept alongside other project info (not a separate
// progress-only bucket) so the Main Menu can hydrate from a single electron-store read.
// sourceLanguage/targetLanguage are deliberately not cached here -- nothing reads them
// off the list entry (only the live `project` redux slice, populated on project open,
// is ever consulted), so caching them would just be dead weight kept in sync for nothing.
// Re-exported from the shared bridge contract as-is -- no FE-only enums involved.
export const ProjectCacheEntrySchema = ProjectCacheEntryContractSchema;
export type TProjectCacheEntry = z.infer<typeof ProjectCacheEntrySchema>;

// Re-exported from the shared bridge contract as-is -- no FE-only enums involved.
export const PromptTemplateCacheEntrySchema = PromptTemplateCacheEntryContractSchema;
export type TPromptTemplateCacheEntry = z.infer<typeof PromptTemplateCacheEntrySchema>;

// Narrows the bridge contract's loose sourceLanguage/targetLanguage (plain strings) to this
// app's TLanguage enum.
export const GlossaryCacheEntrySchema = GlossaryCacheEntryContractV1Schema.extend({
  sourceLanguage: LanguageCodeSchema,
  targetLanguage: LanguageCodeSchema,
});
export type TGlossaryCacheEntry = z.infer<typeof GlossaryCacheEntrySchema>;

// Rebuilt (rather than re-exporting the bridge contract's FolderScanResultV1Schema) so its
// `glossaries` record uses the strict, FE-narrowed GlossaryCacheEntrySchema above.
export const FolderScanCacheSchema = z.object({
  folder: z.string(),
  scannedAt: z.number(),
  projects: z.record(z.string(), ProjectCacheEntrySchema).catch({}),
  promptTemplates: z.record(z.string(), PromptTemplateCacheEntrySchema).catch({}),
  glossaries: z.record(z.string(), GlossaryCacheEntrySchema).catch({}),
});
export type TFolderScanCache = z.infer<typeof FolderScanCacheSchema>;

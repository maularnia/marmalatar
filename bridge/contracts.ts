// Single place where every bridge contract's version config (schemas per version, transforms
// between them, min/current version) is wired up via defineVersionedContract. Keeping all of
// these together -- instead of one defineVersionedContract call scattered per contract file --
// makes it possible to see every contract's version state at a glance instead of having to open
// each entity file in turn.
//
// The Zod schemas themselves stay in their own entity files (appSettings.ts, projectState.ts,
// etc.) since those also export the schema/type for use elsewhere; this file only imports them
// to build each contract's version config and reader.
import { defineVersionedContract, createVersionedReader } from './versioning';
import { AppSettingsContractV1Schema } from './definitions/appSettings';
import { GlossaryCacheEntryContractV1Schema } from './definitions/glossaryCacheEntry';
import { ProjectCacheEntryV1Schema } from './definitions/projectCacheEntry';
import { ProjectStateV1Schema } from './definitions/projectState';
import { PromptTemplateCacheEntryV1Schema } from './definitions/promptTemplateCacheEntry';
import { FolderScanResultV1Schema } from './definitions/scanResult';
import { OllamaSettingsV1Schema } from './definitions/ollamaSettings';
import { LMStudioSettingsV1Schema } from './definitions/lmStudioSettings';
import { DeepLSettingsV1Schema } from './definitions/deepLSettings';

export const AppSettingsVersioning = defineVersionedContract({
  name: 'AppSettings',
  minSupportedVersion: 1,
  currentVersion: 1,
  schemas: { 1: AppSettingsContractV1Schema },
  transforms: {},
  current: AppSettingsContractV1Schema,
});
export const readAppSettingsContract = createVersionedReader(AppSettingsVersioning);

export const GlossaryCacheEntryVersioning = defineVersionedContract({
  name: 'GlossaryCacheEntry',
  minSupportedVersion: 1,
  currentVersion: 1,
  schemas: { 1: GlossaryCacheEntryContractV1Schema },
  transforms: {},
  current: GlossaryCacheEntryContractV1Schema,
});
export const readGlossaryCacheEntry = createVersionedReader(GlossaryCacheEntryVersioning);

export const ProjectCacheEntryVersioning = defineVersionedContract({
  name: 'ProjectCacheEntry',
  minSupportedVersion: 1,
  currentVersion: 1,
  schemas: { 1: ProjectCacheEntryV1Schema },
  transforms: {},
  current: ProjectCacheEntryV1Schema,
});
export const readProjectCacheEntry = createVersionedReader(ProjectCacheEntryVersioning);

export const ProjectStateVersioning = defineVersionedContract({
  name: 'ProjectState',
  minSupportedVersion: 1,
  currentVersion: 1,
  schemas: { 1: ProjectStateV1Schema },
  transforms: {},
  current: ProjectStateV1Schema,
});
export const readProjectState = createVersionedReader(ProjectStateVersioning);

export const PromptTemplateCacheEntryVersioning = defineVersionedContract({
  name: 'PromptTemplateCacheEntry',
  minSupportedVersion: 1,
  currentVersion: 1,
  schemas: { 1: PromptTemplateCacheEntryV1Schema },
  transforms: {},
  current: PromptTemplateCacheEntryV1Schema,
});
export const readPromptTemplateCacheEntry = createVersionedReader(
  PromptTemplateCacheEntryVersioning
);

// Its `transforms`/`schemas` will eventually need to fold in migrations of the nested
// project/prompt-template/glossary records too, once a V2 exists -- nothing to do there today
// since there's only one version.
export const FolderScanResultVersioning = defineVersionedContract({
  name: 'FolderScanResult',
  minSupportedVersion: 1,
  currentVersion: 1,
  schemas: { 1: FolderScanResultV1Schema },
  transforms: {},
  current: FolderScanResultV1Schema,
});
export const readFolderScanResult = createVersionedReader(FolderScanResultVersioning);

export const OllamaSettingsVersioning = defineVersionedContract({
  name: 'OllamaSettings',
  minSupportedVersion: 1,
  currentVersion: 1,
  schemas: { 1: OllamaSettingsV1Schema },
  transforms: {},
  current: OllamaSettingsV1Schema,
});
export const readOllamaSettings = createVersionedReader(OllamaSettingsVersioning);

export const LMStudioSettingsVersioning = defineVersionedContract({
  name: 'LMStudioSettings',
  minSupportedVersion: 1,
  currentVersion: 1,
  schemas: { 1: LMStudioSettingsV1Schema },
  transforms: {},
  current: LMStudioSettingsV1Schema,
});
export const readLMStudioSettings = createVersionedReader(LMStudioSettingsVersioning);

export const DeepLSettingsVersioning = defineVersionedContract({
  name: 'DeepLSettings',
  minSupportedVersion: 1,
  currentVersion: 1,
  schemas: { 1: DeepLSettingsV1Schema },
  transforms: {},
  current: DeepLSettingsV1Schema,
});
export const readDeepLSettings = createVersionedReader(DeepLSettingsVersioning);

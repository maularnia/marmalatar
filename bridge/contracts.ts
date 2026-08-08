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
import { ProjectStateV1Schema } from './definitions/projectState';
import { FolderScanResultV1Schema } from './definitions/scanResult';
import { OllamaSettingsV1Schema } from './definitions/ollamaSettings';
import { LMStudioSettingsV1Schema } from './definitions/lmStudioSettings';
import { DeepLSettingsV1Schema } from './definitions/deepLSettings';

const AppSettingsVersioning = defineVersionedContract({
  name: 'AppSettings',
  minSupportedVersion: 1,
  currentVersion: 1,
  schemas: { 1: AppSettingsContractV1Schema },
  transforms: {},
  current: AppSettingsContractV1Schema,
});
export const readAppSettingsContract = createVersionedReader(AppSettingsVersioning);

const ProjectStateVersioning = defineVersionedContract({
  name: 'ProjectState',
  minSupportedVersion: 1,
  currentVersion: 1,
  schemas: { 1: ProjectStateV1Schema },
  transforms: {},
  current: ProjectStateV1Schema,
});
export const readProjectState = createVersionedReader(ProjectStateVersioning);

// Its `transforms`/`schemas` will eventually need to fold in migrations of the nested
// project/prompt-template/glossary records too, once a V2 exists -- nothing to do there today
// since there's only one version. Individual cache entries (project/prompt-template/glossary)
// are never read on their own -- only ever as part of this whole cache blob -- so there's no
// per-entry versioned reader here, just the schemas each entry is validated against on write
// (see the definitions/*CacheEntry.ts files and their call sites).
const FolderScanResultVersioning = defineVersionedContract({
  name: 'FolderScanResult',
  minSupportedVersion: 1,
  currentVersion: 1,
  schemas: { 1: FolderScanResultV1Schema },
  transforms: {},
  current: FolderScanResultV1Schema,
});
export const readFolderScanResult = createVersionedReader(FolderScanResultVersioning);

const OllamaSettingsVersioning = defineVersionedContract({
  name: 'OllamaSettings',
  minSupportedVersion: 1,
  currentVersion: 1,
  schemas: { 1: OllamaSettingsV1Schema },
  transforms: {},
  current: OllamaSettingsV1Schema,
});
export const readOllamaSettings = createVersionedReader(OllamaSettingsVersioning);

const LMStudioSettingsVersioning = defineVersionedContract({
  name: 'LMStudioSettings',
  minSupportedVersion: 1,
  currentVersion: 1,
  schemas: { 1: LMStudioSettingsV1Schema },
  transforms: {},
  current: LMStudioSettingsV1Schema,
});
export const readLMStudioSettings = createVersionedReader(LMStudioSettingsVersioning);

const DeepLSettingsVersioning = defineVersionedContract({
  name: 'DeepLSettings',
  minSupportedVersion: 1,
  currentVersion: 1,
  schemas: { 1: DeepLSettingsV1Schema },
  transforms: {},
  current: DeepLSettingsV1Schema,
});
export const readDeepLSettings = createVersionedReader(DeepLSettingsVersioning);

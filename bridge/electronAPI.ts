import type { ProjectState } from './definitions/projectState';
import type { AppSettingsContract } from './definitions/appSettings';
import type { IntegrationSettings } from './definitions/integrationSettings';
import type { ProjectCacheEntry } from './definitions/projectCacheEntry';
import type { PromptTemplateCacheEntry } from './definitions/promptTemplateCacheEntry';
import type { GlossaryCacheEntryContract } from './definitions/glossaryCacheEntry';
import type { FolderScanResult } from './definitions/scanResult';
import type {
  LMStudioTranslationParams,
  LMStudioTranslationResult,
  TokenizeWithLMStudioParams,
} from './definitions/lmStudio';
import type {
  DeepLTranslationParams,
  DeepLTranslationResult,
  DeepLGlossaryOption,
} from './definitions/deepl';

// Canonical shape of the `window.electronAPI` bridge exposed by electron/preload.ts and consumed
// directly as `window.electronAPI` throughout src/ -- the single source of truth both sides are
// typed against, so a signature drift between what preload.ts exposes and what the renderer
// expects is a compile error rather than a silent runtime break.
export interface ElectronAPI {
  platform: string;
  getAppSettings: () => Promise<AppSettingsContract | null>;
  setAppSettings: (settings: AppSettingsContract) => Promise<void>;
  getProjectState: (projectId: string) => Promise<ProjectState | null>;
  setProjectState: (projectId: string, projectState: ProjectState) => Promise<void>;
  removeProjectState: (projectId: string) => Promise<void>;
  getIntegrationSettings: (integrationId: string) => Promise<IntegrationSettings | null>;
  setIntegrationSettings: (integrationId: string, settings: IntegrationSettings) => Promise<void>;
  getFolderScanCache: () => Promise<FolderScanResult | null>;
  setFolderScanCache: (cache: FolderScanResult) => Promise<void>;
  upsertProjectCacheEntry: (entry: ProjectCacheEntry) => Promise<void>;
  removeProjectCacheEntry: (filePath: string) => Promise<void>;
  updateProjectCacheProgress: (filePath: string, translationProgress: number) => Promise<void>;
  upsertPromptTemplateCacheEntry: (entry: PromptTemplateCacheEntry) => Promise<void>;
  removePromptTemplateCacheEntry: (fileName: string) => Promise<void>;
  upsertGlossaryCacheEntry: (entry: GlossaryCacheEntryContract) => Promise<void>;
  removeGlossaryCacheEntry: (fileName: string) => Promise<void>;
  getTrackedFolder: () => Promise<string | null>;
  setTrackedFolder: (folder: string) => Promise<void>;
  selectFolder: () => Promise<string | null>;
  listMrmlFiles: () => Promise<string[]>;
  listPromptTemplateFiles: () => Promise<string[]>;
  listAIGlossaryFiles: () => Promise<string[]>;
  // Path is resolved against (and may not escape) the tracked folder -- see
  // electron/modules/scanner/scannerIpc.ts's resolveTrackedPath.
  deleteFile: (relativePath: string) => Promise<void>;
  checkFileExists: (relativePath: string) => Promise<boolean>;
  readFile: (relativePath: string) => Promise<string | null>;
  writeFile: (relativePath: string, content: string) => Promise<void>;
  // Unrestricted existence check for a path outside the tracked folder (video files can live
  // anywhere on disk) -- everything above this line is tracked-folder-relative, this one isn't.
  checkExternalPathExists: (absolutePath: string) => Promise<boolean>;
  getPathForFile: (file: File) => string;
  extractWaveformPeaks: (filePath: string) => Promise<number[]>;
  generateThumbnail: (filePath: string) => Promise<string>;
  lmStudioPing: (host: string) => Promise<boolean>;
  lmStudioListModels: (host: string) => Promise<Array<{ value: string; label: string }>>;
  lmStudioTranslate: (params: LMStudioTranslationParams) => Promise<LMStudioTranslationResult>;
  lmStudioCancel: (requestId: string) => Promise<void>;
  lmStudioTokenize: (params: TokenizeWithLMStudioParams) => Promise<number>;
  deeplEncryptionAvailable: () => Promise<boolean>;
  getDeepLApiKey: () => Promise<string>;
  setDeepLApiKey: (apiKey: string) => Promise<void>;
  deeplPing: (apiKey: string) => Promise<boolean>;
  deeplListGlossaries: (apiKey: string) => Promise<DeepLGlossaryOption[]>;
  deeplTranslate: (params: DeepLTranslationParams) => Promise<DeepLTranslationResult>;
}

import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { ElectronAPI } from '../bridge/electronAPI';
import type { ProjectState } from '../bridge/definitions/projectState';
import type { AppSettingsContract } from '../bridge/definitions/appSettings';
import type { IntegrationSettings } from '../bridge/definitions/integrationSettings';
import type { ProjectCacheEntry } from '../bridge/definitions/projectCacheEntry';
import type { PromptTemplateCacheEntry } from '../bridge/definitions/promptTemplateCacheEntry';
import type { GlossaryCacheEntryContract } from '../bridge/definitions/glossaryCacheEntry';
import type { FolderScanResult } from '../bridge/definitions/scanResult';
import type {
  LMStudioTranslationParams,
  TokenizeWithLMStudioParams,
} from '../bridge/definitions/lmStudio';
import type { DeepLTranslationParams } from '../bridge/definitions/deepl';

// Builds a camelCase electronAPI method that forwards its arguments verbatim to the given
// kebab-case IPC channel -- collapses the repeated `(args) => ipcRenderer.invoke('channel', args)`
// wiring below into a one-line channel-name -> handler mapping.
function invoke<Args extends unknown[] = []>(channel: string) {
  return (...args: Args) => ipcRenderer.invoke(channel, ...args);
}

// Typed against the shared ElectronAPI contract so a missing/renamed/mistyped method here is a
// compile error, not a silent runtime "is not a function" in the renderer.
const api: ElectronAPI = {
  platform: process.platform,
  getTrackedFolder: invoke('get-tracked-folder'),
  setTrackedFolder: invoke<[string]>('set-tracked-folder'),
  getAppSettings: invoke('get-app-settings'),
  setAppSettings: invoke<[AppSettingsContract]>('set-app-settings'),
  getProjectState: invoke<[string]>('get-project-state'),
  setProjectState: invoke<[string, ProjectState]>('set-project-state'),
  removeProjectState: invoke<[string]>('remove-project-state'),
  getIntegrationSettings: invoke<[string]>('get-integration-settings'),
  setIntegrationSettings: invoke<[string, IntegrationSettings]>('set-integration-settings'),
  getFolderScanCache: invoke('get-folder-scan-cache'),
  setFolderScanCache: invoke<[FolderScanResult]>('set-folder-scan-cache'),
  upsertProjectCacheEntry: invoke<[ProjectCacheEntry]>('upsert-project-cache-entry'),
  removeProjectCacheEntry: invoke<[string]>('remove-project-cache-entry'),
  updateProjectCacheProgress: invoke<[string, number]>('update-project-cache-progress'),
  upsertPromptTemplateCacheEntry: invoke<[PromptTemplateCacheEntry]>(
    'upsert-prompt-template-cache-entry'
  ),
  removePromptTemplateCacheEntry: invoke<[string]>('remove-prompt-template-cache-entry'),
  upsertGlossaryCacheEntry: invoke<[GlossaryCacheEntryContract]>('upsert-glossary-cache-entry'),
  removeGlossaryCacheEntry: invoke<[string]>('remove-glossary-cache-entry'),
  selectFolder: invoke('select-folder'),
  listMrmlFiles: invoke('list-project-files'),
  listPromptTemplateFiles: invoke('list-prompt-template-files'),
  listAIGlossaryFiles: invoke('list-glossary-files'),
  deleteFile: invoke<[string]>('delete-file'),
  checkFileExists: invoke<[string]>('check-file-exists'),
  readFile: invoke<[string]>('read-file'),
  writeFile: invoke<[string, string]>('write-file'),
  checkExternalPathExists: invoke<[string]>('check-external-path-exists'),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  extractWaveformPeaks: invoke<[string]>('extract-waveform-peaks'),
  generateThumbnail: invoke<[string]>('generate-thumbnail'),
  lmStudioPing: invoke<[string]>('lmstudio-ping'),
  lmStudioListModels: invoke<[string]>('lmstudio-list-models'),
  lmStudioTranslate: invoke<[LMStudioTranslationParams]>('lmstudio-translate'),
  lmStudioCancel: invoke<[string]>('lmstudio-cancel'),
  lmStudioTokenize: invoke<[TokenizeWithLMStudioParams]>('lmstudio-tokenize'),
  deeplEncryptionAvailable: invoke('deepl-encryption-available'),
  getDeepLApiKey: invoke('get-deepl-api-key'),
  setDeepLApiKey: invoke<[string]>('set-deepl-api-key'),
  deeplPing: invoke<[string]>('deepl-ping'),
  deeplListGlossaries: invoke<[string]>('deepl-list-glossaries'),
  deeplTranslate: invoke<[DeepLTranslationParams]>('deepl-translate'),
};

contextBridge.exposeInMainWorld('electronAPI', api);

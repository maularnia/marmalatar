import type Store from 'electron-store';
import {
  FolderScanResultV1Schema,
  type FolderScanResult,
} from '../../../bridge/definitions/scanResult';
import { readFolderScanResult } from '../../../bridge/contracts';

// Folder-scan cache: lightweight project/prompt-template/glossary list metadata (incl.
// translationProgress) rendered by the Main Menu without any live filesystem/content read.
// Shared substrate for the project/promptTemplate/glossary modules, each of which only mutates
// its own slice (`projects`/`promptTemplates`/`glossaries`).

const EMPTY_CACHE: FolderScanResult = {
  version: 1,
  folder: '',
  scannedAt: 0,
  projects: {},
  promptTemplates: {},
  glossaries: {},
};

export function getFolderScanCache(appStore: Store): FolderScanResult {
  const raw = appStore.get('folderScanCache');
  return raw ? readFolderScanResult(raw) : EMPTY_CACHE;
}

// Each call does its appStore.get -> mutate -> appStore.set synchronously (no `await` in between)
// so concurrent IPC calls can't interleave into a torn write.
export function updateFolderScanCache(
  appStore: Store,
  mutate: (cache: FolderScanResult) => void
): void {
  const cache = getFolderScanCache(appStore);
  mutate(cache);
  appStore.set('folderScanCache', FolderScanResultV1Schema.parse(cache));
}

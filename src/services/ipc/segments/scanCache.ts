import { IPCSegment } from '../IPCSegment';

// The tracked folder's scan cache: the project, prompt template and glossary lists.
export class IPCScanCache extends IPCSegment {
  static readonly segmentName = 'scanCache';

  readonly get = this.bridgeCall('scanner', 'getFolderScanCache');
  readonly set = this.bridgeCall('scanner', 'setFolderScanCache');
  readonly upsertProject = this.bridgeCall('project', 'upsertCacheEntry');
  readonly removeProject = this.bridgeCall('project', 'removeCacheEntry');
  readonly updateProjectProgress = this.bridgeCall('project', 'updateCacheProgress');
  readonly upsertPromptTemplate = this.bridgeCall('promptTemplate', 'upsertCacheEntry');
  readonly removePromptTemplate = this.bridgeCall('promptTemplate', 'removeCacheEntry');
  readonly upsertGlossary = this.bridgeCall('glossary', 'upsertCacheEntry');
  readonly removeGlossary = this.bridgeCall('glossary', 'removeCacheEntry');
}

import { IPCSegment } from '../IPCSegment';

// The tracked folder's scan cache: the project, prompt template and glossary lists.
export class IPCScanCache extends IPCSegment {
  static readonly segmentName = 'scanCache';

  readonly get = this.bridgeCall('getFolderScanCache');
  readonly set = this.bridgeCall('setFolderScanCache');
  readonly upsertProject = this.bridgeCall('upsertProjectCacheEntry');
  readonly removeProject = this.bridgeCall('removeProjectCacheEntry');
  readonly updateProjectProgress = this.bridgeCall('updateProjectCacheProgress');
  readonly upsertPromptTemplate = this.bridgeCall('upsertPromptTemplateCacheEntry');
  readonly removePromptTemplate = this.bridgeCall('removePromptTemplateCacheEntry');
  readonly upsertGlossary = this.bridgeCall('upsertGlossaryCacheEntry');
  readonly removeGlossary = this.bridgeCall('removeGlossaryCacheEntry');
}

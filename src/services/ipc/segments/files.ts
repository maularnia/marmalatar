import { IPCSegment } from '../IPCSegment';

// The tracked folder. Files inside it are reached only through the projects, prompt templates and
// glossaries segments.
export class IPCFiles extends IPCSegment {
  static readonly segmentName = 'files';

  readonly getTrackedFolder = this.bridgeCall('scanner', 'getTrackedFolder');
  readonly setTrackedFolder = this.bridgeCall('scanner', 'setTrackedFolder');
  readonly selectFolder = this.bridgeCall('scanner', 'selectFolder');
  // Lists are cached in the main process until this; it picks up files changed outside the app
  readonly rescan = this.bridgeCall('scanner', 'dropCache');
  readonly checkForeignFileExists = this.bridgeCall('scanner', 'checkForeignFileExists');
  readonly getPathFile = (file: File) => window.electronAPI.getPathForFile(file);
}

import { IPCSegment } from '../IPCSegment';

// The tracked folder. Files inside it are reached only through the projects, prompt templates and
// glossaries segments.
export class IPCFiles extends IPCSegment {
  static readonly segmentName = 'files';

  readonly getTrackedFolder = this.bridgeCall('scanner', 'getTrackedFolder');
  readonly setTrackedFolder = this.bridgeCall('scanner', 'setTrackedFolder');
  readonly selectFolder = this.bridgeCall('scanner', 'selectFolder');
  // The folder's file listing, as the main process caches it
  readonly getScan = this.bridgeCall('scanner', 'getScan');
  // Drops the cached listing and scans again, picking up files changed outside the app
  readonly rescan = this.bridgeCall('scanner', 'rescan');
  readonly checkForeignFileExists = this.bridgeCall('scanner', 'checkForeignFileExists');
  readonly getPathFile = (file: File) => window.electronAPI.getPathForFile(file);
}

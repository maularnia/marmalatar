import { IPCSegment } from '../IPCSegment';

// The tracked folder and file access. Paths are relative to the tracked folder unless the name
// says otherwise.
export class IPCFiles extends IPCSegment {
  static readonly segmentName = 'files';

  readonly getTrackedFolder = this.bridgeCall('scanner', 'getTrackedFolder');
  readonly setTrackedFolder = this.bridgeCall('scanner', 'setTrackedFolder');
  readonly selectFolder = this.bridgeCall('scanner', 'selectFolder');
  // Lists are cached in the main process until this; it picks up files changed outside the app
  readonly rescan = this.bridgeCall('scanner', 'dropCache');
  readonly deleteFile = this.bridgeCall('scanner', 'deleteFile');
  readonly checkFileExists = this.bridgeCall('scanner', 'checkFileExists');
  readonly readFile = this.bridgeCall('scanner', 'readFile');
  readonly writeFile = this.bridgeCall('scanner', 'writeFile');
  readonly checkExternalPathExists = this.bridgeCall('scanner', 'checkExternalPathExists');
  readonly getPathFile = (file: File) => window.electronAPI.getPathForFile(file);
}

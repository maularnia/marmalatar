import { IPCSegment } from '../IPCSegment';

// The tracked folder and file access. Paths are relative to the tracked folder unless the name
// says otherwise.
export class IPCFiles extends IPCSegment {
  static readonly segmentName = 'files';

  readonly getTrackedFolder = this.bridgeCall('getTrackedFolder');
  readonly setTrackedFolder = this.bridgeCall('setTrackedFolder');
  readonly selectFolder = this.bridgeCall('selectFolder');
  readonly listMrmlFiles = this.bridgeCall('listMrmlFiles');
  readonly listPromptTemplateFiles = this.bridgeCall('listPromptTemplateFiles');
  readonly listAIGlossaryFiles = this.bridgeCall('listAIGlossaryFiles');
  readonly deleteFile = this.bridgeCall('deleteFile');
  readonly checkFileExists = this.bridgeCall('checkFileExists');
  readonly readFile = this.bridgeCall('readFile');
  readonly writeFile = this.bridgeCall('writeFile');
  readonly checkExternalPathExists = this.bridgeCall('checkExternalPathExists');
  readonly getPathFile = this.bridgeCall('getPathForFile');
}

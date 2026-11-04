import { IPCSegment } from '../IPCSegment';

// The tracked folder's projects, plus each project's device-specific state (editor mode, video
// path), keyed by projectId.
export class IPCProjects extends IPCSegment {
  static readonly segmentName = 'projects';

  readonly list = this.bridgeCall('project', 'list');
  readonly getState = this.bridgeCall('project', 'getState');
  readonly setState = this.bridgeCall('project', 'setState');
  readonly updateProgress = this.bridgeCall('project', 'updateProgress');
}

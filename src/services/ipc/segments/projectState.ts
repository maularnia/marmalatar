import { IPCSegment } from '../IPCSegment';

// Per-project device-specific state (editor mode, video path), keyed by projectId.
export class IPCProjectState extends IPCSegment {
  static readonly segmentName = 'projectState';

  readonly get = this.bridgeCall('project', 'getState');
  readonly set = this.bridgeCall('project', 'setState');
  readonly remove = this.bridgeCall('project', 'removeState');
}

import { IPCSegment } from '../IPCSegment';

// Per-project device-specific state (editor mode, video path), keyed by projectId.
export class IPCProjectState extends IPCSegment {
  static readonly segmentName = 'projectState';

  readonly get = this.bridgeCall('getProjectState');
  readonly set = this.bridgeCall('setProjectState');
  readonly remove = this.bridgeCall('removeProjectState');
}

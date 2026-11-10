import { IPCSegment } from '../IPCSegment';

// The tracked folder's projects and each project's device-specific state (editor mode, video
// path, computed progress), keyed by projectId. The renderer writes only the lines and characters:
// name, emoji and languages change through their own calls.
export class IPCProjects extends IPCSegment {
  static readonly segmentName = 'projects';

  readonly list = this.bridgeCall('project', 'list');
  readonly get = this.bridgeCall('project', 'get');
  readonly set = this.bridgeCall('project', 'set');
  readonly create = this.bridgeCall('project', 'create');
  readonly rename = this.bridgeCall('project', 'rename');
  readonly setEmoji = this.bridgeCall('project', 'setEmoji');
  readonly setLanguages = this.bridgeCall('project', 'setLanguages');
  readonly setHidden = this.bridgeCall('project', 'setHidden');
  readonly addToDictionary = this.bridgeCall('project', 'addToDictionary');
  readonly delete = this.bridgeCall('project', 'delete');
  readonly getState = this.bridgeCall('project', 'getState');
  readonly setState = this.bridgeCall('project', 'setState');
}

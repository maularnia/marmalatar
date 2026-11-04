import { IPCSegment } from '../IPCSegment';

// The tracked folder's prompt templates, keyed by file name. The renderer writes only the template
// text: title and emoji change through their own calls.
export class IPCPromptTemplates extends IPCSegment {
  static readonly segmentName = 'promptTemplates';

  readonly list = this.bridgeCall('promptTemplate', 'list');
  readonly get = this.bridgeCall('promptTemplate', 'get');
  readonly set = this.bridgeCall('promptTemplate', 'set');
  readonly create = this.bridgeCall('promptTemplate', 'create');
  readonly rename = this.bridgeCall('promptTemplate', 'rename');
  readonly setEmoji = this.bridgeCall('promptTemplate', 'setEmoji');
  readonly delete = this.bridgeCall('promptTemplate', 'delete');
}

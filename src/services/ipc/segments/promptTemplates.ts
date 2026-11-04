import { IPCSegment } from '../IPCSegment';

// The tracked folder's prompt templates
export class IPCPromptTemplates extends IPCSegment {
  static readonly segmentName = 'promptTemplates';

  readonly list = this.bridgeCall('promptTemplate', 'list');
}

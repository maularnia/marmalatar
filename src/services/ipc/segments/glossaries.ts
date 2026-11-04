import { IPCSegment } from '../IPCSegment';

// The tracked folder's glossaries
export class IPCGlossaries extends IPCSegment {
  static readonly segmentName = 'glossaries';

  readonly list = this.bridgeCall('glossary', 'list');
}

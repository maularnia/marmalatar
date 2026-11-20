import { IPCSegment } from '../IPCSegment';

// The tracked folder's glossaries, keyed by file name. The renderer writes only the pair list:
// title, emoji and languages change through their own calls.
export class IPCGlossaries extends IPCSegment {
  static readonly segmentName = 'glossaries';

  readonly list = this.bridgeCall('glossary', 'list');
  readonly get = this.bridgeCall('glossary', 'get');
  readonly set = this.bridgeCall('glossary', 'set');
  readonly create = this.bridgeCall('glossary', 'create');
  readonly rename = this.bridgeCall('glossary', 'rename');
  readonly setEmoji = this.bridgeCall('glossary', 'setEmoji');
  readonly setLanguages = this.bridgeCall('glossary', 'setLanguages');
  readonly delete = this.bridgeCall('glossary', 'delete');
}

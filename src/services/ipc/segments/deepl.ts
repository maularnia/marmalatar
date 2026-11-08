import { IPCSegment } from '../IPCSegment';

// DeepL requests and its API key, which only the main process can decrypt.
export class IPCDeepl extends IPCSegment {
  static readonly segmentName = 'deepl';

  readonly getApiKey = this.bridgeCall('deepl', 'getApiKey');
  readonly setApiKey = this.bridgeCall('deepl', 'setApiKey');
  readonly ping = this.bridgeCall('deepl', 'ping');
  readonly listGlossaries = this.bridgeCall('deepl', 'listGlossaries');
  readonly translate = this.bridgeCall('deepl', 'translate');
}

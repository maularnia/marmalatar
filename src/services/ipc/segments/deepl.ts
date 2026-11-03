import { IPCSegment } from '../IPCSegment';

// DeepL requests and its API key, which only the main process can decrypt.
export class IPCDeepl extends IPCSegment {
  static readonly segmentName = 'deepl';

  readonly getApiKey = this.bridgeCall('getDeepLApiKey');
  readonly setApiKey = this.bridgeCall('setDeepLApiKey');
  readonly ping = this.bridgeCall('deeplPing');
  readonly listGlossaries = this.bridgeCall('deeplListGlossaries');
  readonly translate = this.bridgeCall('deeplTranslate');
}

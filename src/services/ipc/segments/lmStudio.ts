import { IPCSegment } from '../IPCSegment';

// LM Studio requests. They run in the main process, where CORS doesn't apply.
export class IPCLmStudio extends IPCSegment {
  static readonly segmentName = 'lmStudio';

  readonly ping = this.bridgeCall('lmStudio', 'ping');
  readonly listModels = this.bridgeCall('lmStudio', 'listModels');
  readonly translate = this.bridgeCall('lmStudio', 'translate');
  readonly cancel = this.bridgeCall('lmStudio', 'cancel');
  readonly tokenize = this.bridgeCall('lmStudio', 'tokenize');
}

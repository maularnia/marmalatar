import { IPCSegment } from '../IPCSegment';

// LM Studio requests. They run in the main process, where CORS doesn't apply.
export class IPCLmStudio extends IPCSegment {
  static readonly segmentName = 'lmStudio';

  readonly ping = this.bridgeCall('lmStudioPing');
  readonly listModels = this.bridgeCall('lmStudioListModels');
  readonly translate = this.bridgeCall('lmStudioTranslate');
  readonly cancel = this.bridgeCall('lmStudioCancel');
  readonly tokenize = this.bridgeCall('lmStudioTokenize');
}

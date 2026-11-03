import { IPCSegment } from '../IPCSegment';

// Whether the OS can encrypt the secrets the app stores, such as API keys
export class IPCEncryption extends IPCSegment {
  static readonly segmentName = 'encryption';

  readonly isAvailable = this.bridgeCall('isEncryptionAvailable');
}

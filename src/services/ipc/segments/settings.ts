import { IPCSegment } from '../IPCSegment';

// App and AI integration settings, stored in electron-store.
export class IPCSettings extends IPCSegment {
  static readonly segmentName = 'settings';

  readonly getAppSettings = this.bridgeCall('getAppSettings');
  readonly setAppSettings = this.bridgeCall('setAppSettings');
  readonly getIntegrationSettings = this.bridgeCall('getIntegrationSettings');
  readonly setIntegrationSettings = this.bridgeCall('setIntegrationSettings');
}

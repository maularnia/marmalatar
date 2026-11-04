import { IPCSegment } from '../IPCSegment';

// App and AI integration settings, stored in electron-store.
export class IPCSettings extends IPCSegment {
  static readonly segmentName = 'settings';

  readonly getAppSettings = this.bridgeCall('settings', 'get');
  readonly setAppSettings = this.bridgeCall('settings', 'set');
  readonly getIntegrationSettings = this.bridgeCall('integrations', 'getSettings');
  readonly setIntegrationSettings = this.bridgeCall('integrations', 'setSettings');
}

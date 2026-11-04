// The service handlers on window.electronAPI, without what preload adds next to them
type TServicesApi = Omit<Window['electronAPI'], 'getPathForFile'>;

// Turns a service and handler name into a function calling it. IPC provides the implementation.
export type TBridgeCall = <S extends keyof TServicesApi, H extends keyof TServicesApi[S]>(
  service: S,
  handler: H
) => TServicesApi[S][H];

// One themed group of main-process calls. Subclasses declare a static `segmentName`, the property
// they're exposed under on IPC, and build their methods on `bridgeCall`.
export abstract class IPCSegment {
  constructor(protected readonly bridgeCall: TBridgeCall) {}
}

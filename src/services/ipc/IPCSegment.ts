import type { ElectronAPI } from '@bridge/electronAPI';

type TBridgeMethodName = {
  [K in keyof ElectronAPI]: ElectronAPI[K] extends (...args: never[]) => unknown ? K : never;
}[keyof ElectronAPI];

// Turns a bridge method name into a function calling it. IPC provides the implementation.
export type TBridgeCall = <K extends TBridgeMethodName>(name: K) => ElectronAPI[K];

// One themed group of main-process calls. Subclasses declare a static `segmentName`, the property
// they're exposed under on IPC, and build their methods on `bridgeCall`.
export abstract class IPCSegment {
  constructor(protected readonly bridgeCall: TBridgeCall) {}
}

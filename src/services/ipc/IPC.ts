import type { IPCSegment, TBridgeCall } from './IPCSegment';
import { IPCDeepl } from './segments/deepl';
import { IPCEncryption } from './segments/encryption';
import { IPCFiles } from './segments/files';
import { IPCGlossaries } from './segments/glossaries';
import { IPCLmStudio } from './segments/lmStudio';
import { IPCMedia } from './segments/media';
import { IPCProjects } from './segments/projects';
import { IPCPromptTemplates } from './segments/promptTemplates';
import { IPCSettings } from './segments/settings';
import { IPCSpellcheck } from './segments/spellcheck';

// Every segment IPC exposes. Adding a class here is all it takes: IPC's type is derived from this
// list, so the new segment shows up as a typed property.
const SEGMENTS = [
  IPCSettings,
  IPCFiles,
  IPCProjects,
  IPCPromptTemplates,
  IPCGlossaries,
  IPCMedia,
  IPCLmStudio,
  IPCDeepl,
  IPCEncryption,
  IPCSpellcheck,
] as const;

// What IPC needs from a segment class: the name it's exposed under, and a constructor taking the
// bridge.
type TIPCSegmentClass = {
  readonly segmentName: string;
  new (bridgeCall: TBridgeCall): IPCSegment;
};

type TIPCSegments = {
  readonly [C in (typeof SEGMENTS)[number] as C['segmentName']]: InstanceType<C>;
};
type TIPCSegmentName = keyof TIPCSegments;

// Fails on a duplicate name: the later segment would silently replace the earlier one.
function initializeSegments(
  segments: readonly TIPCSegmentClass[],
  bridge: TBridgeCall
): Map<string, IPCSegment> {
  const instances = new Map<string, IPCSegment>();
  for (const Segment of segments) {
    if (instances.has(Segment.segmentName)) {
      throw new Error(`IPC: duplicate segment name "${Segment.segmentName}"`);
    }
    instances.set(Segment.segmentName, new Segment(bridge));
  }
  return instances;
}

// A class whose instances have every segment as a property, so IPCService can extend it and get
// those properties typed without declaring each one by hand.
const SegmentProperties = class {} as new () => TIPCSegments;

// The renderer's single entry point to the main process. Use the `IPC` instance below.
class IPCService extends SegmentProperties {
  private static instance: IPCService | null = null;

  static getInstance(): IPCService {
    IPCService.instance ??= new IPCService();
    return IPCService.instance;
  }

  // Segment names in SEGMENTS order
  readonly segmentNames: readonly TIPCSegmentName[];

  // `window.electronAPI` is read at call time, not when the segment is created, so the bridge can
  // be swapped (e.g. in a test harness) after IPC was imported.
  private readonly bridgeCall: TBridgeCall = (service, handler) =>
    ((...args: unknown[]) =>
      (window.electronAPI[service][handler] as (...callArgs: unknown[]) => unknown)(
        ...args
      )) as never;

  private constructor() {
    super();
    const instances = initializeSegments(SEGMENTS, this.bridgeCall);
    instances.forEach((instance, name) => {
      Object.defineProperty(this, name, { value: instance, enumerable: true });
    });
    this.segmentNames = [...instances.keys()] as TIPCSegmentName[];
  }
}

export const IPC = IPCService.getInstance();

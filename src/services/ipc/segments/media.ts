import { IPCSegment } from '../IPCSegment';

// Video and audio processing through ffmpeg, and its cache.
export class IPCMedia extends IPCSegment {
  static readonly segmentName = 'media';

  readonly extractWaveformPeaks = this.bridgeCall('media', 'extractWaveformPeaks');
  readonly getVideoMetadata = this.bridgeCall('media', 'getVideoMetadata');
  readonly extractAudio = this.bridgeCall('media', 'extractAudio');
  readonly listAudioTracks = this.bridgeCall('media', 'listAudioTracks');
  readonly cleanupCache = this.bridgeCall('media', 'cleanupCache');
}

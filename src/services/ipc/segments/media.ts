import { IPCSegment } from '../IPCSegment';

// Video and audio processing through ffmpeg, and its cache.
export class IPCMedia extends IPCSegment {
  static readonly segmentName = 'media';

  readonly extractWaveformPeaks = this.bridgeCall('extractWaveformPeaks');
  readonly generateThumbnail = this.bridgeCall('generateThumbnail');
  readonly extractAudio = this.bridgeCall('extractAudio');
  readonly listAudioTracks = this.bridgeCall('listAudioTracks');
  readonly cleanupCache = this.bridgeCall('cleanupCache');
}

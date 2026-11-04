import { IPCSegment } from '../IPCSegment';

// Video and audio processing through ffmpeg, and its cache.
export class IPCMedia extends IPCSegment {
  static readonly segmentName = 'media';

  readonly extractWaveformPeaks = this.bridgeCall('media', 'extractWaveformPeaks');
  readonly generateThumbnail = this.bridgeCall('media', 'generateThumbnail');
  readonly extractAudio = this.bridgeCall('media', 'extractAudio');
  readonly listAudioTracks = this.bridgeCall('media', 'listAudioTracks');
  readonly cleanupCache = this.bridgeCall('media', 'cleanupCache');
}

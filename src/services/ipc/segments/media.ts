import { IPCSegment } from '../IPCSegment';

// Video and audio processing through ffmpeg, and its cache.
export class IPCMedia extends IPCSegment {
  static readonly segmentName = 'media';

  readonly extractWaveformPeaks = this.bridgeCall('media', 'extractWaveformPeaks');
  readonly getVideoMetadata = this.bridgeCall('media', 'getVideoMetadata');
  readonly extractAudio = this.bridgeCall('media', 'extractAudio');
  readonly listAudioTracks = this.bridgeCall('media', 'listAudioTracks');
  readonly cleanupCache = this.bridgeCall('media', 'cleanupCache');
  // The health beacon over the selected video's files: started and stopped by the renderer, which
  // hears from it (onBundleLost) when a file breaks
  readonly startHealthBeacon = this.bridgeCall('media', 'startHealthBeacon');
  readonly stopHealthBeacon = this.bridgeCall('media', 'stopHealthBeacon');
  readonly onBundleLost = (listener: Parameters<typeof window.electronAPI.onMediaBundleLost>[0]) =>
    window.electronAPI.onMediaBundleLost(listener);
}

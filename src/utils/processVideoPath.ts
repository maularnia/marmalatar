type VideoPathProcessResult = {
  waveformPeaks: number[];
  previewImage: string | null;
};

export async function processVideoPath(filePath: string): Promise<VideoPathProcessResult> {
  const [waveformPeaks, previewImage] = await Promise.all([
    window.electronAPI.extractWaveformPeaks(filePath),
    // A thumbnail-generation failure shouldn't take down the waveform result alongside it.
    window.electronAPI.generateThumbnail(filePath).catch(() => null),
  ]);
  return { waveformPeaks, previewImage };
}

export function pathToFileUrl(filePath: string): string {
  return 'file:///' + filePath.replace(/\\/g, '/');
}

const AUDIO_DECODE_TIMEOUT_MS = 1500;
const AUDIO_DECODE_POLL_MS = 50;

type VideoElementWithLegacyProps = HTMLVideoElement & {
  webkitAudioDecodedByteCount?: number;
  audioTracks?: { length: number };
};

export type VideoPlayabilityResult = 'ok' | 'unsupportedVideo' | 'unsupportedAudio';

export function checkVideoPlayability(filePath: string): Promise<VideoPlayabilityResult> {
  return new Promise((resolve) => {
    const el = document.createElement('video') as VideoElementWithLegacyProps;
    el.preload = 'auto';
    // volume = 0 (rather than muted) keeps Chromium's audio decode pipeline active
    // so webkitAudioDecodedByteCount actually advances.
    el.volume = 0;

    let settled = false;
    let pollInterval: ReturnType<typeof setInterval> | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const finish = (result: VideoPlayabilityResult) => {
      if (settled) return;
      settled = true;
      if (pollInterval !== undefined) clearInterval(pollInterval);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      el.pause();
      el.src = '';
      resolve(result);
    };

    // Fires on a container/video-decode failure, before metadata (and therefore
    // any audio track info) is even available -- this is a video-side failure.
    el.onerror = () => finish('unsupportedVideo');

    el.onloadedmetadata = () => {
      if (el.audioTracks && el.audioTracks.length === 0) {
        finish('ok');
        return;
      }

      const hasDecodedAudio = () =>
        el.webkitAudioDecodedByteCount === undefined || el.webkitAudioDecodedByteCount > 0;

      pollInterval = setInterval(() => {
        if (hasDecodedAudio()) finish('ok');
      }, AUDIO_DECODE_POLL_MS);

      timeoutId = setTimeout(
        () => finish(hasDecodedAudio() ? 'ok' : 'unsupportedAudio'),
        AUDIO_DECODE_TIMEOUT_MS
      );

      void el.play().catch(() => finish('unsupportedVideo'));
    };

    el.src = pathToFileUrl(filePath);
  });
}

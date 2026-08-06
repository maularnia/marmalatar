export function pathToFileUrl(filePath: string): string {
  return 'file:///' + filePath.replace(/\\/g, '/');
}

const AUDIO_DECODE_TIMEOUT_MS = 1500;
const AUDIO_DECODE_POLL_MS = 50;

type VideoElementWithLegacyProps = HTMLVideoElement & {
  webkitAudioDecodedByteCount?: number;
  audioTracks?: { length: number };
};

export function checkVideoPlayability(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const el = document.createElement('video') as VideoElementWithLegacyProps;
    el.preload = 'auto';
    // volume = 0 (rather than muted) keeps Chromium's audio decode pipeline active
    // so webkitAudioDecodedByteCount actually advances.
    el.volume = 0;

    let settled = false;
    let pollInterval: ReturnType<typeof setInterval> | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      if (pollInterval !== undefined) clearInterval(pollInterval);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      el.pause();
      el.src = '';
      resolve(result);
    };

    el.onerror = () => finish(false);

    el.onloadedmetadata = () => {
      if (el.audioTracks && el.audioTracks.length === 0) {
        finish(true);
        return;
      }

      const hasDecodedAudio = () =>
        el.webkitAudioDecodedByteCount === undefined || el.webkitAudioDecodedByteCount > 0;

      pollInterval = setInterval(() => {
        if (hasDecodedAudio()) finish(true);
      }, AUDIO_DECODE_POLL_MS);

      timeoutId = setTimeout(() => finish(hasDecodedAudio()), AUDIO_DECODE_TIMEOUT_MS);

      void el.play().catch(() => finish(false));
    };

    el.src = pathToFileUrl(filePath);
  });
}

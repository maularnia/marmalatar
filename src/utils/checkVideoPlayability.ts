export function pathToFileUrl(filePath: string): string {
  return 'file:///' + filePath.replace(/\\/g, '/');
}

const AUDIO_DECODE_TIMEOUT_MS = 1500;
const AUDIO_DECODE_POLL_MS = 50;

type VideoElementWithLegacyProps = HTMLVideoElement & {
  webkitAudioDecodedByteCount?: number;
  audioTracks?: { length: number };
};

// Container/video-decode check only -- resolves on loadedmetadata, rejects on a decode/container
// error. Does not touch audio at all; see checkAudioPlayability for that.
export function checkVideoDecodable(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement('video');
    el.preload = 'metadata';

    el.onerror = () => {
      el.src = '';
      reject(new Error('Video is not decodable'));
    };
    el.onloadedmetadata = () => {
      el.src = '';
      resolve();
    };

    el.src = pathToFileUrl(filePath);
  });
}

// Audio-decode-byte-count check, generic over any media file -- works against a video file's
// embedded audio track (original-file check) or a bare audio file (post-conversion recheck).
// Resolves if audio decodes, rejects otherwise.
export function checkAudioPlayability(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement('video') as VideoElementWithLegacyProps;
    el.preload = 'auto';
    // volume = 0 (rather than muted) keeps Chromium's audio decode pipeline active
    // so webkitAudioDecodedByteCount actually advances.
    el.volume = 0;

    let settled = false;
    let pollInterval: ReturnType<typeof setInterval> | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const finish = (playable: boolean) => {
      if (settled) return;
      settled = true;
      if (pollInterval !== undefined) clearInterval(pollInterval);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      el.pause();
      el.src = '';
      if (playable) {
        resolve();
      } else {
        reject(new Error('Audio is not playable'));
      }
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

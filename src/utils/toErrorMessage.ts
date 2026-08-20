const MAX_ERROR_MESSAGE_LENGTH = 300;

// Keeps the tail rather than the head -- for ffmpeg errors in particular (the main source of
// these), the actual diagnostic is almost always at the end of the message, with verbose
// context/banner text preceding it.
export function toErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > MAX_ERROR_MESSAGE_LENGTH
    ? message.slice(-MAX_ERROR_MESSAGE_LENGTH)
    : message;
}

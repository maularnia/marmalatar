const MAX_REST_LENGTH = 200;

// The first line is always kept in full (usually the actual "what went wrong" summary), and only
// the rest -- everything after the first \n, typically verbose context/banner text -- is trimmed.
// When trimming, the tail rather than the head is kept: for ffmpeg errors in particular (the main
// source of these), the actual diagnostic tends to be at the end of that remaining text.
export function toErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const newlineIndex = message.indexOf('\n');

  if (newlineIndex === -1) {
    return message.length > MAX_REST_LENGTH ? message.slice(-MAX_REST_LENGTH) : message;
  }

  const firstLine = message.slice(0, newlineIndex);
  const rest = message.slice(newlineIndex + 1);
  const trimmedRest = rest.length > MAX_REST_LENGTH ? rest.slice(-MAX_REST_LENGTH) : rest;

  return trimmedRest ? `${firstLine}\n${trimmedRest}` : firstLine;
}

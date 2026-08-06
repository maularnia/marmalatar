import { HttpStatusError } from '@src/services/ai/types';

const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: 'The request was invalid.',
  401: 'Authentication failed. Check your credentials.',
  403: 'Access to this resource was denied.',
  404: 'The requested endpoint was not found. Check the address.',
  408: 'The request timed out.',
  409: 'The request could not be completed due to a conflict.',
  422: 'The request could not be processed.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'The server encountered an internal error.',
  502: 'The server received an invalid response from upstream.',
  503: 'The service is temporarily unavailable. It may still be starting up.',
  504: 'The server took too long to respond.',
};

function describeHttpStatus(status: number): string {
  if (HTTP_STATUS_MESSAGES[status]) {
    return HTTP_STATUS_MESSAGES[status];
  }
  if (status >= 500) {
    return `The server encountered an error (status ${status}).`;
  }
  if (status >= 400) {
    return `The request could not be completed (status ${status}).`;
  }
  return `Request failed with status ${status}.`;
}

/**
 * Turns an unknown thrown value into a human-readable message, recognizing the most common
 * failure shapes (HTTP status errors, aborted/cancelled requests, network/connection failures)
 * before falling back to the error's own message.
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'An unexpected error occurred.'
): string {
  if (error instanceof HttpStatusError) {
    return describeHttpStatus(error.status);
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'The request was cancelled.';
  }
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return 'Could not reach the server. Make sure it is running and the address is correct.';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error) {
    return error;
  }
  return fallback;
}

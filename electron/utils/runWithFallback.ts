// Collapses the repeated `try { return … } catch { return fallback }` pattern used across the
// filesystem-facing IPC handlers, where a missing/unreadable file is an expected, non-fatal case.
export function runWithFallback<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/** A throttled function: call it as often as you like, `fn` runs at most once per interval */
export type TThrottled<A extends unknown[]> = ((...args: A) => void) & {
  /** Drops a call still waiting for the end of the interval */
  cancel: () => void;
};

/** Runs `fn` at most once every `intervalMs`. A call made when the interval has passed runs at
 * once; calls inside it are collapsed into one that runs, with the latest arguments, when the
 * interval ends -- so the last call is never lost. */
export function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  intervalMs: number
): TThrottled<A> {
  let lastRunAt = Number.NEGATIVE_INFINITY;
  let pendingArgs: A | null = null;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const run = (args: A) => {
    lastRunAt = performance.now();
    fn(...args);
  };

  const throttled = ((...args: A) => {
    const wait = lastRunAt + intervalMs - performance.now();
    if (wait <= 0 && timeout === null) {
      run(args);
      return;
    }
    pendingArgs = args;
    if (timeout !== null) return;
    timeout = setTimeout(
      () => {
        timeout = null;
        const latest = pendingArgs;
        pendingArgs = null;
        if (latest) run(latest);
      },
      Math.max(0, wait)
    );
  }) as TThrottled<A>;

  throttled.cancel = () => {
    if (timeout !== null) clearTimeout(timeout);
    timeout = null;
    pendingArgs = null;
  };

  return throttled;
}

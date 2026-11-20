import fs from 'fs';
import path from 'path';
import type { TMediaBundlePart, TMediaBundleStatus } from '../../../bridge/definitions/mediaBundle';

/** The files of one video bundle, and how to tell each one is still usable */
export type TMediaBundleFiles = {
  videoPath: string;
  trackId: number;
  // Absolute paths; null when the service has no file for a part (it counts as broken)
  files: Record<TMediaBundlePart, string | null>;
  // Extra checks on a part's content, beyond being readable and non-empty
  validators?: Partial<Record<TMediaBundlePart, (file: string) => boolean>>;
};

type TBeaconState = 'idle' | 'tracking' | 'failed';

// What a part looked like when tracking started. The inode catches a replace by rename or atomic
// save even when size and mtime are kept
type TFileFingerprint = { size: number; mtimeMs: number; ino: number };
type TFingerprints = Partial<Record<TMediaBundlePart, TFileFingerprint>>;

// Changes come in bursts (a delete, an atomic save): one check after they settle
const RECHECK_DEBOUNCE_MS = 200;

const BUNDLE_PARTS: readonly TMediaBundlePart[] = ['video', 'audio', 'waveform'];

/** Watches the files of the video the renderer has selected and reports once when any of them goes
 * missing, unreadable, empty, invalid, or changed since tracking started (any change at all counts:
 * the player's data must stay the data the selection was made with). Owned by the media service, which only exposes it; what
 * gets tracked, and when, is decided by the renderer.
 *
 * A strict state machine, so flaws in how it's driven surface at once instead of being papered
 * over: idle → tracking → failed.
 * - start() only from idle: starting while tracking or failed (without stop() first) throws.
 * - A broken bundle moves it to failed (watchers closed, notified once). It stays failed until
 *   stop() acknowledges it.
 * - stop() from any state returns to idle; stopping an idle beacon does nothing. */
export class MediaHealthBeacon {
  private state: TBeaconState = 'idle';
  private bundle: TMediaBundleFiles | null = null;
  private notify: ((status: TMediaBundleStatus) => void) | null = null;
  private watchers: fs.FSWatcher[] = [];
  private recheckTimeout: ReturnType<typeof setTimeout> | null = null;
  private fingerprints: TFingerprints = {};

  /** Checks the bundle once and returns its status. A healthy bundle is then tracked (`notify` is
   * called when it breaks); a broken one leaves the beacon failed right away. */
  async start(
    bundle: TMediaBundleFiles,
    notify: (status: TMediaBundleStatus) => void
  ): Promise<TMediaBundleStatus> {
    if (this.state !== 'idle') {
      const current = this.bundle?.videoPath ?? 'a video';
      throw new Error(
        this.state === 'failed'
          ? `Media health beacon failed on ${current} and wasn't stopped: stop it before starting another`
          : `Media health beacon is already tracking ${current}: stop it before starting another`
      );
    }
    this.state = 'tracking';
    this.bundle = bundle;
    this.notify = notify;
    // The first check has nothing to compare against: it takes the fingerprints
    this.fingerprints = {};

    const { status, fingerprints } = await this.check(bundle);
    // Stopped (or restarted) while checking: this run is over
    if (this.bundle !== bundle) return status;
    if (!status.ok) {
      this.fail();
      return status;
    }
    this.fingerprints = fingerprints;
    this.watch(bundle);
    return status;
  }

  stop(): void {
    this.closeWatchers();
    this.state = 'idle';
    this.bundle = null;
    this.notify = null;
    this.fingerprints = {};
  }

  // Watches the folders holding the files, not the files themselves: a watch on a file ends when
  // it's deleted or renamed, and atomic saves replace the file under it
  private watch(bundle: TMediaBundleFiles): void {
    const names = new Set(
      Object.values(bundle.files).flatMap((file) => (file ? [path.basename(file)] : []))
    );
    const dirs = new Set(
      Object.values(bundle.files).flatMap((file) => (file ? [path.dirname(file)] : []))
    );
    for (const dir of dirs) {
      try {
        const watcher = fs.watch(dir, (_event, fileName) => {
          if (!fileName || names.has(fileName.toString())) this.scheduleRecheck();
        });
        // The folder itself gone or unwatchable: check what's left
        watcher.on('error', () => this.scheduleRecheck());
        this.watchers.push(watcher);
      } catch {
        // A folder that can't even be watched is as good as gone
        this.scheduleRecheck();
      }
    }
  }

  private scheduleRecheck(): void {
    if (this.state !== 'tracking') return;
    if (this.recheckTimeout !== null) clearTimeout(this.recheckTimeout);
    this.recheckTimeout = setTimeout(() => {
      this.recheckTimeout = null;
      const bundle = this.bundle;
      if (!bundle || this.state !== 'tracking') return;
      void this.check(bundle).then(({ status }) => {
        if (this.bundle !== bundle || this.state !== 'tracking' || status.ok) return;
        const notify = this.notify;
        this.fail();
        notify?.(status);
      });
    }, RECHECK_DEBOUNCE_MS);
  }

  private fail(): void {
    this.closeWatchers();
    this.state = 'failed';
    this.fingerprints = {};
  }

  private closeWatchers(): void {
    if (this.recheckTimeout !== null) clearTimeout(this.recheckTimeout);
    this.recheckTimeout = null;
    for (const watcher of this.watchers) watcher.close();
    this.watchers = [];
  }

  // Each part must exist, be readable, not be empty, pass its own validator if it has one, and
  // still match the fingerprint taken when tracking started (when there is one)
  private async check(
    bundle: TMediaBundleFiles
  ): Promise<{ status: TMediaBundleStatus; fingerprints: TFingerprints }> {
    const fingerprints: TFingerprints = {};
    const results = await Promise.all(
      BUNDLE_PARTS.map(async (part) => {
        const file = bundle.files[part];
        if (!file) return part;
        try {
          await fs.promises.access(file, fs.constants.R_OK);
          const { size, mtimeMs, ino } = await fs.promises.stat(file);
          if (size === 0) return part;
          const validate = bundle.validators?.[part];
          if (validate && !validate(file)) return part;
          const known = this.fingerprints[part];
          if (known && (known.size !== size || known.mtimeMs !== mtimeMs || known.ino !== ino)) {
            return part;
          }
          fingerprints[part] = { size, mtimeMs, ino };
          return null;
        } catch {
          return part;
        }
      })
    );
    const broken = results.filter((part): part is TMediaBundlePart => part !== null);
    const { videoPath, trackId } = bundle;
    const status: TMediaBundleStatus = broken.length
      ? { videoPath, trackId, ok: false, broken }
      : { videoPath, trackId, ok: true };
    return { status, fingerprints };
  }
}

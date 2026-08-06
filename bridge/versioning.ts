import { z } from 'zod';

// Data is version N, newer than this build's currentVersion -- it was written by a newer version
// of the app (e.g. after a downgrade) and this build has no schema/transform for it.
export class IncompatibleSchemaVersionError extends Error {
  constructor(contractName: string, foundVersion: number, currentVersion: number) {
    super(
      `${contractName}: data is version ${foundVersion}, which is newer than this build supports ` +
        `(current: ${currentVersion}). This usually means the data was written by a newer version ` +
        `of the app.`
    );
    this.name = 'IncompatibleSchemaVersionError';
  }
}

// Data is version N, older than this build's minSupportedVersion -- support for migrating from
// that version has been dropped (its schema/transform entries were deleted from the contract's
// config once minSupportedVersion was raised past it).
export class UnsupportedLegacyVersionError extends Error {
  constructor(contractName: string, foundVersion: number, minSupportedVersion: number) {
    super(
      `${contractName}: data is version ${foundVersion}, older than the oldest version this build ` +
        `still migrates from (minimum: ${minSupportedVersion}). Support for this version has been ` +
        `dropped.`
    );
    this.name = 'UnsupportedLegacyVersionError';
  }
}

const VersionProbeSchema = z.object({ version: z.number().optional() });

export interface VersionedContractConfig<TSchema extends z.ZodTypeAny> {
  /** Human-readable name used in error messages. */
  name: string;
  /** Oldest version this build still knows how to migrate from. */
  minSupportedVersion: number;
  /** The version this build reads/writes -- must equal the highest key in `schemas`. */
  currentVersion: number;
  /** One schema per supported version, keyed by version number, minSupportedVersion..currentVersion. */
  schemas: Record<number, z.ZodTypeAny>;
  /**
   * One transformer per version *below* currentVersion, keyed by the version it transforms FROM.
   * transforms[N] takes version-N data (already validated against schemas[N]) and returns data
   * shaped for version N+1 (validated against schemas[N+1] before continuing).
   */
  transforms: Record<number, (data: unknown) => unknown>;
  /** schemas[currentVersion] -- kept as its own field so the reader's return type is exact. */
  current: TSchema;
}

// Fails fast at module-load time (not at some future runtime read) if a contract's config doesn't
// actually cover every version it claims to support.
export function defineVersionedContract<TSchema extends z.ZodTypeAny>(
  config: VersionedContractConfig<TSchema>
): VersionedContractConfig<TSchema> {
  for (let v = config.minSupportedVersion; v <= config.currentVersion; v++) {
    if (!config.schemas[v]) {
      throw new Error(`${config.name}: missing schema for version ${v}`);
    }
    if (v < config.currentVersion && !config.transforms[v]) {
      throw new Error(`${config.name}: missing transform from version ${v} to ${v + 1}`);
    }
  }
  return config;
}

// Returns a reader that walks raw, potentially-stale persisted data forward from whatever version
// it was written at up to the contract's currentVersion, running each version's transform in turn,
// re-validating at every step.
export function createVersionedReader<TSchema extends z.ZodTypeAny>(
  config: VersionedContractConfig<TSchema>
): (raw: unknown) => z.infer<TSchema> {
  return (raw: unknown): z.infer<TSchema> => {
    const probe = VersionProbeSchema.safeParse(raw);
    const foundVersion = probe.success && probe.data.version !== undefined ? probe.data.version : 1;

    if (foundVersion > config.currentVersion) {
      throw new IncompatibleSchemaVersionError(config.name, foundVersion, config.currentVersion);
    }
    if (foundVersion < config.minSupportedVersion) {
      throw new UnsupportedLegacyVersionError(
        config.name,
        foundVersion,
        config.minSupportedVersion
      );
    }

    let version = foundVersion;
    let data: unknown = config.schemas[version].parse(raw);
    while (version < config.currentVersion) {
      data = config.transforms[version](data);
      version += 1;
      data = config.schemas[version].parse(data);
    }
    return data as z.infer<TSchema>;
  };
}

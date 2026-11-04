import type { TScanEntry, TScanResult } from './scanFolder';

type TFileEntry = { readonly fileHash: string };

type TNormalizeParams<TEntry extends TFileEntry, TExtracted> = {
  scan: TScanResult;
  extension: string;
  list: Readonly<Record<string, TEntry>>;
  // Scan hash the list was last normalized against
  scanHash: string | undefined;
  // Reads a file the list has no up-to-date entry for. null leaves the file out (unreadable or
  // invalid).
  extract: (file: TScanEntry) => TExtracted | null;
  keyOf: (extracted: TExtracted, file: TScanEntry) => string;
  // Builds the entry for an extracted file. `previous` is the entry stored under the same key, so
  // a renamed or re-saved file keeps the data the file doesn't hold.
  build: (file: TScanEntry, extracted: TExtracted, previous: TEntry | undefined) => TEntry;
};

type TNormalized<TEntry> = {
  list: Record<string, TEntry>;
  scanHash: string;
  // false when the scan hasn't changed since the last normalization, so there's nothing to save
  changed: boolean;
};

// Brings a service's list in line with the scanner's file listing: drops entries whose file is
// gone, keeps entries whose file is unchanged, and reads only new or changed files.
export function normalizeEntries<TEntry extends TFileEntry, TExtracted>(
  params: TNormalizeParams<TEntry, TExtracted>
): TNormalized<TEntry> {
  const { scan, extension, list: previousList, scanHash } = params;
  if (scanHash === scan.hash) {
    return { list: { ...previousList }, scanHash, changed: false };
  }

  const keyByHash = new Map(
    Object.entries(previousList).map(([key, entry]) => [entry.fileHash, key])
  );
  const list: Record<string, TEntry> = {};
  const unknownFiles: TScanEntry[] = [];

  // Unchanged files go first, so a copied file (same key, new hash) can't take over the original's
  // entry
  for (const file of scan.files) {
    if (file.extension !== extension) continue;
    const key = keyByHash.get(file.fileHash);
    if (key === undefined) unknownFiles.push(file);
    else list[key] = previousList[key];
  }

  for (const file of unknownFiles) {
    const extracted = params.extract(file);
    if (extracted === null) continue;
    const key = params.keyOf(extracted, file);
    // Two files with one key (a copied project): the first one listed wins
    if (key in list) continue;
    list[key] = params.build(file, extracted, previousList[key]);
  }

  return { list, scanHash: scan.hash, changed: true };
}

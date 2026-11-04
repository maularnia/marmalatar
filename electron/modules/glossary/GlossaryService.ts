import { z } from 'zod';
import {
  GlossaryFileHeaderSchema,
  type TGlossaryListEntry,
} from '../../../bridge/definitions/glossaryEntry';
import { readJsonFile } from '../../utils/readJsonFile';
import { normalizeEntries } from '../scanner/normalizeEntries';
import { ScannerService, scanLegacyTrackedFolder } from '../scanner/ScannerService';
import { readLegacyEntries } from '../service/readLegacyEntries';
import { Service } from '../service/Service';
import type { TVersioning } from '../service/storeVersioning';

const EXTENSION = '.mrmlg';

type TGlossaryEntry = TGlossaryListEntry & { fileHash: string };

type TGlossaryData = {
  // Keyed by fileName
  list: Record<string, TGlossaryEntry>;
  scanHash: string;
};

// Version 0 kept these in the scanner's folderScanCache.glossaries, keyed by fileName
const LegacyGlossaryCacheEntrySchema = z.object({
  fileName: z.string(),
  title: z.string(),
  emoji: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
});

function toListEntry({ fileHash: _, ...entry }: TGlossaryEntry): TGlossaryListEntry {
  return entry;
}

export class GlossaryService extends Service<TGlossaryData> {
  static readonly serviceName = 'glossary';

  readonly versioning: TVersioning<TGlossaryData> = {
    0: (store) => {
      const scan = scanLegacyTrackedFolder(store);
      if (!scan) return {};
      const filesByName = new Map(scan.files.map((file) => [file.fileName, file]));
      const list: Record<string, TGlossaryEntry> = {};
      // No scanHash: the first read still normalizes, but every file migrated here matches by hash
      // and isn't read again
      for (const legacy of readLegacyEntries(
        (store.folderScanCache as { glossaries?: unknown } | undefined)?.glossaries,
        LegacyGlossaryCacheEntrySchema
      )) {
        const file = filesByName.get(legacy.fileName);
        if (file?.extension !== EXTENSION) continue;
        list[file.fileName] = {
          ...legacy,
          fileName: file.fileName,
          filePath: file.filePath,
          fileHash: file.fileHash,
        };
      }
      return { list };
    },
  };

  readonly handlers = [
    this.handle('list', () =>
      Object.values(this.readList())
        .sort((a, b) => a.fileName.localeCompare(b.fileName))
        .map(toListEntry)
    ),
  ] as const;

  // The list, renormalized against the scanner's current listing
  private readList(): Record<string, TGlossaryEntry> {
    const { list, scanHash, changed } = normalizeEntries({
      scan: ScannerService.getInstance().scan(),
      extension: EXTENSION,
      list: this.store.get('list') ?? {},
      scanHash: this.store.get('scanHash'),
      extract: (file) => readJsonFile(file.filePath, GlossaryFileHeaderSchema),
      keyOf: (_, file) => file.fileName,
      build: (file, { title, emoji, sourceLanguage, targetLanguage }) => ({
        fileName: file.fileName,
        filePath: file.filePath,
        fileHash: file.fileHash,
        title,
        emoji,
        sourceLanguage,
        targetLanguage,
      }),
    });
    if (changed) {
      this.store.set('list', list);
      this.store.set('scanHash', scanHash);
    }
    return list;
  }
}

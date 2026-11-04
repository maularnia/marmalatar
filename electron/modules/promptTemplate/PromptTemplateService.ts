import { z } from 'zod';
import {
  PromptTemplateFileHeaderSchema,
  type TPromptTemplateListEntry,
} from '../../../bridge/definitions/promptTemplateEntry';
import { readJsonFile } from '../../utils/readJsonFile';
import { normalizeEntries } from '../scanner/normalizeEntries';
import { ScannerService, scanLegacyTrackedFolder } from '../scanner/ScannerService';
import { readLegacyEntries } from '../service/readLegacyEntries';
import { Service } from '../service/Service';
import type { TVersioning } from '../service/storeVersioning';

const EXTENSION = '.mrmlpt';

type TPromptTemplateEntry = TPromptTemplateListEntry & { fileHash: string };

type TPromptTemplateData = {
  // Keyed by fileName
  list: Record<string, TPromptTemplateEntry>;
  scanHash: string;
};

// Version 0 kept these in the scanner's folderScanCache.promptTemplates, keyed by fileName
const LegacyPromptTemplateCacheEntrySchema = z.object({
  fileName: z.string(),
  title: z.string(),
  emoji: z.string(),
});

function toListEntry({ fileHash: _, ...entry }: TPromptTemplateEntry): TPromptTemplateListEntry {
  return entry;
}

export class PromptTemplateService extends Service<TPromptTemplateData> {
  static readonly serviceName = 'promptTemplate';

  readonly versioning: TVersioning<TPromptTemplateData> = {
    0: (store) => {
      const scan = scanLegacyTrackedFolder(store);
      if (!scan) return {};
      const filesByName = new Map(scan.files.map((file) => [file.fileName, file]));
      const list: Record<string, TPromptTemplateEntry> = {};
      // No scanHash: the first read still normalizes, but every file migrated here matches by hash
      // and isn't read again
      for (const legacy of readLegacyEntries(
        (store.folderScanCache as { promptTemplates?: unknown } | undefined)?.promptTemplates,
        LegacyPromptTemplateCacheEntrySchema
      )) {
        const file = filesByName.get(legacy.fileName);
        if (file?.extension !== EXTENSION) continue;
        list[file.fileName] = {
          fileName: file.fileName,
          filePath: file.filePath,
          fileHash: file.fileHash,
          title: legacy.title,
          emoji: legacy.emoji,
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
  private readList(): Record<string, TPromptTemplateEntry> {
    const { list, scanHash, changed } = normalizeEntries({
      scan: ScannerService.getInstance().scan(),
      extension: EXTENSION,
      list: this.store.get('list') ?? {},
      scanHash: this.store.get('scanHash'),
      extract: (file) => readJsonFile(file.filePath, PromptTemplateFileHeaderSchema),
      keyOf: (_, file) => file.fileName,
      build: (file, { title, emoji }) => ({
        fileName: file.fileName,
        filePath: file.filePath,
        fileHash: file.fileHash,
        title,
        emoji,
      }),
    });
    if (changed) {
      this.store.set('list', list);
      this.store.set('scanHash', scanHash);
    }
    return list;
  }
}

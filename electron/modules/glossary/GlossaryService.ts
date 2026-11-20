import type { IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import {
  GlossaryFileBodySchema,
  GlossaryFileHeaderSchema,
  type TGlossaryCreateInput,
  type TGlossaryFileBody,
  type TGlossaryListEntry,
} from '../../../bridge/definitions/glossaryEntry';
import { GLOSSARY_EXTENSION, toGlossaryFileName } from '../../../bridge/fileNames';
import { readJsonFile } from '../../utils/readJsonFile';
import { normalizeEntries } from '../scanner/normalizeEntries';
import { ScannerService, scanLegacyTrackedFolder } from '../scanner/ScannerService';
import { readLegacyEntries } from '../service/readLegacyEntries';
import { Service } from '../service/Service';
import type { TVersioning } from '../service/storeVersioning';

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

type THeader = TGlossaryCreateInput;

function toListEntry({ fileHash: _, ...entry }: TGlossaryEntry): TGlossaryListEntry {
  return entry;
}

function headerOf({ title, emoji, sourceLanguage, targetLanguage }: TGlossaryEntry): THeader {
  return { title, emoji, sourceLanguage, targetLanguage };
}

// The whole .mrmlg file. The header comes from the glossary service, the body from the renderer.
// Both are validated, so a stale list entry can't write a file the list would then drop.
function assembleFile(header: THeader, body: TGlossaryFileBody) {
  return { ...GlossaryFileHeaderSchema.parse(header), ...GlossaryFileBodySchema.parse(body) };
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
        if (file?.extension !== GLOSSARY_EXTENSION) continue;
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
    // The whole file as stored. The renderer validates it against its own contract, and reads the
    // header from it but never writes it.
    this.handle('get', (_: IpcMainInvokeEvent, fileName: string) =>
      fileName in this.readList() ? ScannerService.getInstance().readFile(fileName) : null
    ),
    // Writes the renderer's body under the listed header
    this.handle('set', (_: IpcMainInvokeEvent, fileName: string, body: TGlossaryFileBody) => {
      const entry = this.getEntry(fileName);
      ScannerService.getInstance().writeFile(fileName, assembleFile(headerOf(entry), body));
      return this.getListEntry(fileName);
    }),
    // The file is named after the title. null when a file with that name already exists.
    this.handle(
      'create',
      (_: IpcMainInvokeEvent, input: TGlossaryCreateInput, body: TGlossaryFileBody) => {
        const header = GlossaryFileHeaderSchema.omit({ version: true }).parse(input);
        const fileName = toGlossaryFileName(header.title);
        const scanner = ScannerService.getInstance();
        if (scanner.fileExists(fileName)) return null;
        scanner.writeFile(fileName, assembleFile(header, body));
        return this.getListEntry(fileName);
      }
    ),
    // Renames the file along with the title. null when another file already has the new name.
    this.handle('rename', (_: IpcMainInvokeEvent, fileName: string, title: string) => {
      const entry = this.getEntry(fileName);
      const newFileName = toGlossaryFileName(title);
      const scanner = ScannerService.getInstance();
      if (newFileName !== fileName && scanner.fileExists(newFileName)) return null;
      this.writeHeader(entry, { title });
      scanner.moveFile(fileName, newFileName);
      return this.getListEntry(newFileName);
    }),
    this.handle('set-emoji', (_: IpcMainInvokeEvent, fileName: string, emoji: string) => {
      this.writeHeader(this.getEntry(fileName), { emoji });
      return this.getListEntry(fileName);
    }),
    this.handle(
      'set-languages',
      (_: IpcMainInvokeEvent, fileName: string, sourceLanguage: string, targetLanguage: string) => {
        const entry = this.getEntry(fileName);
        if (entry.sourceLanguage !== sourceLanguage || entry.targetLanguage !== targetLanguage) {
          this.writeHeader(entry, { sourceLanguage, targetLanguage });
        }
        return this.getListEntry(fileName);
      }
    ),
    this.handle('delete', (_: IpcMainInvokeEvent, fileName: string) => {
      ScannerService.getInstance().deleteFile(this.getEntry(fileName).fileName);
    }),
  ] as const;

  private getEntry(fileName: string): TGlossaryEntry {
    const entry = this.readList()[fileName];
    if (!entry) throw new Error(`No glossary ${fileName} in the tracked folder`);
    return entry;
  }

  // Read after a write, so the list already holds the new file
  private getListEntry(fileName: string): TGlossaryListEntry {
    return toListEntry(this.getEntry(fileName));
  }

  // Rewrites the file with header fields replaced, keeping the body as stored
  private writeHeader(entry: TGlossaryEntry, patch: Partial<THeader>): void {
    const scanner = ScannerService.getInstance();
    const body = GlossaryFileBodySchema.safeParse(scanner.readFile(entry.fileName));
    if (!body.success) throw new Error(`Cannot read glossary file ${entry.fileName}`);
    scanner.writeFile(entry.fileName, assembleFile({ ...headerOf(entry), ...patch }, body.data));
  }

  // The list, renormalized against the scanner's current listing
  private readList(): Record<string, TGlossaryEntry> {
    const { list, scanHash, changed } = normalizeEntries({
      scan: ScannerService.getInstance().scan(),
      extension: GLOSSARY_EXTENSION,
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

import type { IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import {
  PromptTemplateFileBodySchema,
  PromptTemplateFileHeaderSchema,
  type TPromptTemplateCreateInput,
  type TPromptTemplateFileBody,
  type TPromptTemplateListEntry,
} from '../../../bridge/definitions/promptTemplateEntry';
import { PROMPT_TEMPLATE_EXTENSION, toPromptTemplateFileName } from '../../../bridge/fileNames';
import { readJsonFile } from '../../utils/readJsonFile';
import { normalizeEntries } from '../scanner/normalizeEntries';
import { ScannerService, scanLegacyTrackedFolder } from '../scanner/ScannerService';
import { readLegacyEntries } from '../service/readLegacyEntries';
import { Service } from '../service/Service';
import type { TVersioning } from '../service/storeVersioning';

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

type THeader = TPromptTemplateCreateInput;

function toListEntry({ fileHash: _, ...entry }: TPromptTemplateEntry): TPromptTemplateListEntry {
  return entry;
}

function headerOf({ title, emoji }: TPromptTemplateEntry): THeader {
  return { title, emoji };
}

// The whole .mrmlpt file. The header comes from the prompt template service, the body from the
// renderer. Both are validated, so a stale list entry can't write a file the list would then drop.
function assembleFile(header: THeader, body: TPromptTemplateFileBody) {
  return {
    ...PromptTemplateFileHeaderSchema.parse(header),
    ...PromptTemplateFileBodySchema.parse(body),
  };
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
        if (file?.extension !== PROMPT_TEMPLATE_EXTENSION) continue;
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
    // The whole file as stored. The renderer validates it against its own contract, and reads the
    // header from it but never writes it.
    this.handle('get', (_: IpcMainInvokeEvent, fileName: string) =>
      fileName in this.readList() ? ScannerService.getInstance().readFile(fileName) : null
    ),
    // Writes the renderer's body under the listed header
    this.handle('set', (_: IpcMainInvokeEvent, fileName: string, body: TPromptTemplateFileBody) => {
      const entry = this.getEntry(fileName);
      ScannerService.getInstance().writeFile(fileName, assembleFile(headerOf(entry), body));
      return this.getListEntry(fileName);
    }),
    // The file is named after the title. null when a file with that name already exists.
    this.handle(
      'create',
      (_: IpcMainInvokeEvent, input: TPromptTemplateCreateInput, body: TPromptTemplateFileBody) => {
        const header = PromptTemplateFileHeaderSchema.omit({ version: true }).parse(input);
        const fileName = toPromptTemplateFileName(header.title);
        const scanner = ScannerService.getInstance();
        if (scanner.fileExists(fileName)) return null;
        scanner.writeFile(fileName, assembleFile(header, body));
        return this.getListEntry(fileName);
      }
    ),
    // Renames the file along with the title. null when another file already has the new name.
    this.handle('rename', (_: IpcMainInvokeEvent, fileName: string, title: string) => {
      const entry = this.getEntry(fileName);
      const newFileName = toPromptTemplateFileName(title);
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
    this.handle('delete', (_: IpcMainInvokeEvent, fileName: string) => {
      ScannerService.getInstance().deleteFile(this.getEntry(fileName).fileName);
    }),
  ] as const;

  private getEntry(fileName: string): TPromptTemplateEntry {
    const entry = this.readList()[fileName];
    if (!entry) throw new Error(`No prompt template ${fileName} in the tracked folder`);
    return entry;
  }

  // Read after a write, so the list already holds the new file
  private getListEntry(fileName: string): TPromptTemplateListEntry {
    return toListEntry(this.getEntry(fileName));
  }

  // Rewrites the file with header fields replaced, keeping the body as stored
  private writeHeader(entry: TPromptTemplateEntry, patch: Partial<THeader>): void {
    const scanner = ScannerService.getInstance();
    const body = PromptTemplateFileBodySchema.safeParse(scanner.readFile(entry.fileName));
    if (!body.success) throw new Error(`Cannot read prompt template file ${entry.fileName}`);
    scanner.writeFile(entry.fileName, assembleFile({ ...headerOf(entry), ...patch }, body.data));
  }

  // The list, renormalized against the scanner's current listing
  private readList(): Record<string, TPromptTemplateEntry> {
    const { list, scanHash, changed } = normalizeEntries({
      scan: ScannerService.getInstance().scan(),
      extension: PROMPT_TEMPLATE_EXTENSION,
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

import type { IpcMainInvokeEvent } from 'electron';
import {
  addDictionaryWord,
  removeDictionaryWord,
  SpellcheckDictionaryFileSchema,
} from '../../../bridge/definitions/spellcheckDictionary';
import {
  fromSpellcheckFileName,
  SPELLCHECK_EXTENSION,
  toSpellcheckFileName,
} from '../../../bridge/fileNames';
import { ScannerService } from '../scanner/ScannerService';
import { Service } from '../service/Service';
import type { TVersioning } from '../service/storeVersioning';

// Global spellcheck dictionaries: one {languageCode}.mrmlspell file per language in the tracked
// folder, holding words the spellcheck accepts in every project. A language's file is created only
// when its first word is added, and deleted with its last one. Nothing is kept in the store: the files are the dictionaries.
export class SpellcheckService extends Service {
  static readonly serviceName = 'spellcheck';

  readonly versioning: TVersioning<Record<string, never>> = {
    0: () => ({}),
  };

  readonly handlers = [
    // Every dictionary in the tracked folder, by language code. Unreadable files count as empty.
    this.handle('list', () => {
      const scanner = ScannerService.getInstance();
      const dictionaries: Record<string, string[]> = {};
      for (const file of scanner.scan().files) {
        if (file.extension !== SPELLCHECK_EXTENSION) continue;
        const languageCode = fromSpellcheckFileName(file.fileName);
        if (languageCode) dictionaries[languageCode] = this.readWords(file.fileName);
      }
      return dictionaries;
    }),
    // Adds a word to a language's dictionary, creating its file on first use. Returns the
    // language's words as written.
    this.handle(
      'add-to-dictionary',
      (_: IpcMainInvokeEvent, languageCode: string, word: string) => {
        const fileName = toSpellcheckFileName(languageCode);
        const wordlist = addDictionaryWord(this.readWords(fileName), word);
        ScannerService.getInstance().writeFile(
          fileName,
          SpellcheckDictionaryFileSchema.parse({ wordlist })
        );
        return wordlist;
      }
    ),
    // Removes a word (as stored) from a language's dictionary. Removing the last word deletes the
    // file, the mirror of creating it on the first. Returns the remaining words.
    this.handle(
      'remove-from-dictionary',
      (_: IpcMainInvokeEvent, languageCode: string, word: string) => {
        const fileName = toSpellcheckFileName(languageCode);
        const wordlist = removeDictionaryWord(this.readWords(fileName), word);
        const scanner = ScannerService.getInstance();
        if (wordlist.length) {
          scanner.writeFile(fileName, SpellcheckDictionaryFileSchema.parse({ wordlist }));
        } else {
          scanner.deleteFile(fileName);
        }
        return wordlist;
      }
    ),
  ] as const;

  // [] when the file doesn't exist or can't be read
  private readWords(fileName: string): string[] {
    const data = ScannerService.getInstance().readFile(fileName);
    const parsed = SpellcheckDictionaryFileSchema.safeParse(data ?? {});
    return parsed.success ? parsed.data.wordlist : [];
  }
}

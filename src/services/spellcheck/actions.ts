import { IPC } from '@src/services/ipc/IPC';
import { projects } from '@src/services/project';
import { Service } from '@src/services/Service';
import { toast } from '@src/services/toast';
import { toErrorMessage } from '@src/utils/toErrorMessage';
import { setGlobalDictionaries, setGlobalDictionary, setProjectDictionaries } from './slice';
import { makeDictionaryUpdateFailedMessage } from './toasts';

// The spellcheck service's operations on the user dictionaries. Each writes its file through the
// main process first and stores what was written, so the store never shows a word the file lacks.

/** Reads every global dictionary in the tracked folder. Runs after each scan (see index.ts): at
 * startup and when the folder changes. */
export async function loadGlobalDictionaries(): Promise<void> {
  try {
    Service.dispatch(setGlobalDictionaries(await IPC.spellcheck.list()));
  } catch {
    // No folder yet, or unreadable: spellcheck simply runs without the user's words
    Service.dispatch(setGlobalDictionaries({}));
  }
}

/** Accepts a word in every project, for one language. Creates the language's .mrmlspell file on
 * first use. Failures are reported with a toast. */
export async function addToGlobalDictionary(language: string, word: string): Promise<void> {
  try {
    const words = await IPC.spellcheck.addToDictionary(language, word);
    Service.dispatch(setGlobalDictionary({ language, words }));
  } catch (error) {
    toast.push(makeDictionaryUpdateFailedMessage(toErrorMessage(error)));
  }
}

/** Accepts a word in the open project only, for one language. Written to the project file at once.
 * Does nothing without an open project; failures are reported with a toast. */
export async function addToProjectDictionary(language: string, word: string): Promise<void> {
  const projectId = projects.get.id();
  if (!projectId) return;
  try {
    const dictionaries = await IPC.projects.addToDictionary(projectId, language, word);
    // The project may have been switched meanwhile; its file got the word either way
    if (projects.get.id() === projectId) Service.dispatch(setProjectDictionaries(dictionaries));
  } catch (error) {
    toast.push(makeDictionaryUpdateFailedMessage(toErrorMessage(error)));
  }
}

/** Removes a word from a language's global dictionary (deleting its file with the last word).
 * Editors check the word again from their next check on. Failures are reported with a toast. */
export async function removeFromGlobalDictionary(language: string, word: string): Promise<void> {
  try {
    const words = await IPC.spellcheck.removeFromDictionary(language, word);
    Service.dispatch(setGlobalDictionary({ language, words }));
  } catch (error) {
    toast.push(makeDictionaryUpdateFailedMessage(toErrorMessage(error)));
  }
}

/** Removes a word from the open project's dictionary for one language. Written to the project file
 * at once; does nothing without an open project. Failures are reported with a toast. */
export async function removeFromProjectDictionary(language: string, word: string): Promise<void> {
  const projectId = projects.get.id();
  if (!projectId) return;
  try {
    const dictionaries = await IPC.projects.removeFromDictionary(projectId, language, word);
    if (projects.get.id() === projectId) Service.dispatch(setProjectDictionaries(dictionaries));
  } catch (error) {
    toast.push(makeDictionaryUpdateFailedMessage(toErrorMessage(error)));
  }
}

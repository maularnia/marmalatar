import { IPCSegment } from '../IPCSegment';

// Global spellcheck dictionaries: one {languageCode}.mrmlspell file per language in the tracked
// folder. A project's own dictionary goes through IPC.projects.addToDictionary.
export class IPCSpellcheck extends IPCSegment {
  static readonly segmentName = 'spellcheck';

  readonly list = this.bridgeCall('spellcheck', 'list');
  readonly addToDictionary = this.bridgeCall('spellcheck', 'addToDictionary');
}

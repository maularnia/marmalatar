// The tracked folder's listing, as the scanner gives it to the renderer and the other main-process
// services. It never holds file contents.

export type TScanEntry = {
  fileName: string;
  filePath: string;
  // With the dot, as path.extname gives it: '.mrml'
  extension: string;
  // Changes when the file is renamed, moved or saved, so services re-read only those files
  fileHash: string;
};

export type TScanResult = {
  // Changes when any file is added, removed or changed, so services can skip a whole rescan
  hash: string;
  // Sorted by fileName
  files: TScanEntry[];
};

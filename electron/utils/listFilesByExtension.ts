import fs from 'fs';
import path from 'path';
import { runWithFallback } from './runWithFallback';

// Used by the project/promptTemplate/glossary modules to list .mrml/.mrmlpt/.mrmlg files in the
// tracked folder. Returns [] (rather than throwing) if the folder is missing/unreadable.
export function listFilesByExtension(folder: string, extension: string): string[] {
  return runWithFallback(
    () =>
      fs
        .readdirSync(folder)
        .filter((f) => f.endsWith(extension))
        .map((f) => path.join(folder, f)),
    []
  );
}

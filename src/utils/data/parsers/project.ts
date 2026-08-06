import { z } from 'zod';
import i18n from '@src/i18n';
import { IncompatibleSchemaVersionError, UnsupportedLegacyVersionError } from '@bridge/versioning';
import { readProjectSaveFile, type TProjectFileData } from '../schemas';

const t = i18n.getFixedT(null, 'errors');

export function parseProjectFile(text: string): TProjectFileData {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(t('project.corrupted'));
  }

  try {
    return readProjectSaveFile(json);
  } catch (err) {
    if (
      err instanceof IncompatibleSchemaVersionError ||
      err instanceof UnsupportedLegacyVersionError
    ) {
      throw new Error(t('project.incompatibleVersion'));
    }
    if (err instanceof z.ZodError) {
      const issue = err.issues[0];
      const path = issue?.path.join('.') ?? 'unknown';
      const msg = issue?.message ?? 'Invalid project file.';
      throw new Error(t('project.invalidFile', { path, message: msg }));
    }
    throw new Error(
      t('project.invalidFile', { path: 'unknown', message: 'Invalid project file.' })
    );
  }
}

// File names in the tracked folder. The main process derives them when it creates or renames a
// file; the renderer uses the same rules only to warn about a name clash before committing.

export const PROJECT_EXTENSION = '.mrml';
export const PROMPT_TEMPLATE_EXTENSION = '.mrmlpt';
export const GLOSSARY_EXTENSION = '.mrmlg';
export const SPELLCHECK_EXTENSION = '.mrmlspell';

function toSlug(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || fallback;
}

export function toProjectFileName(projectName: string): string {
  return `${toSlug(projectName, 'project')}${PROJECT_EXTENSION}`;
}

export function toPromptTemplateFileName(title: string): string {
  return `${toSlug(title, 'prompt-template')}${PROMPT_TEMPLATE_EXTENSION}`;
}

export function toGlossaryFileName(title: string): string {
  return `${toSlug(title, 'glossary')}${GLOSSARY_EXTENSION}`;
}

// App language codes (BE_be). Checked because the file name is built from what the renderer sends.
const LANGUAGE_CODE = /^[A-Z]{2}_[a-z]{2}$/;

export function isLanguageCode(value: string): boolean {
  return LANGUAGE_CODE.test(value);
}

/** A language's global spellcheck dictionary: {languageCode}.mrmlspell */
export function toSpellcheckFileName(languageCode: string): string {
  if (!isLanguageCode(languageCode)) throw new Error(`Invalid language code: ${languageCode}`);
  return `${languageCode}${SPELLCHECK_EXTENSION}`;
}

/** The language code of a {languageCode}.mrmlspell file name, or null for any other file */
export function fromSpellcheckFileName(fileName: string): string | null {
  if (!fileName.endsWith(SPELLCHECK_EXTENSION)) return null;
  const languageCode = fileName.slice(0, -SPELLCHECK_EXTENSION.length);
  return isLanguageCode(languageCode) ? languageCode : null;
}

// File names in the tracked folder. The main process derives them when it creates or renames a
// file; the renderer uses the same rules only to warn about a name clash before committing.

export const PROJECT_EXTENSION = '.mrml';
export const PROMPT_TEMPLATE_EXTENSION = '.mrmlpt';
export const GLOSSARY_EXTENSION = '.mrmlg';

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

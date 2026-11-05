import { buildCsvTable } from '@utils/csvUtils';

type PromptTemplateParams = {
  sourceLanguage: string;
  targetLanguage: string;
  glossaryEntries: Array<[string, string]>;
};

export function resolvePromptTemplate(template: string, params: PromptTemplateParams): string {
  const { sourceLanguage, targetLanguage, glossaryEntries } = params;

  const filteredGlossary = glossaryEntries.filter(([k, v]) => k.trim() && v.trim());
  const glossaryTable = filteredGlossary.length
    ? `Glossary entries as CSV (columns: Original,Translation):\n${buildCsvTable(['Original', 'Translation'], filteredGlossary)}`
    : 'No glossary entries';

  return template
    .split('{SOURCE_LANGUAGE}')
    .join(sourceLanguage)
    .split('{TARGET_LANGUAGE}')
    .join(targetLanguage)
    .split('{GLOSSARY_TABLE}')
    .join(glossaryTable);
}

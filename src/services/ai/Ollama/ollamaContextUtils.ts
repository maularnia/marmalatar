import { TranslationRequestContext } from '@src/services/ai/types';
import { buildCsvTable } from '@utils/csvUtils';

export function buildOllamaSystemPrompt(context?: TranslationRequestContext): string {
  const filteredGlossary = (context?.glossaryEntries ?? [])
    .filter(([name, translated]) => Boolean(name?.trim()) && Boolean(translated?.trim()))
    .map(([name, translated]) => [name.trim(), translated.trim()]);
  const glossaryContext = filteredGlossary.length
    ? buildCsvTable(['Original', 'Translation'], filteredGlossary)
    : '';

  const parts = [
    'You are a subtitle translator.',
    'Return only the translated line text.',
    'Do not add explanations, notes, or quotes.',
    context?.targetLanguage ? `Translate to: ${context.targetLanguage}` : '',
    glossaryContext ? `Glossary (CSV, columns: original,translation):\n${glossaryContext}` : '',
    context?.extraInstructions ? `Additional instructions: ${context.extraInstructions}` : '',
  ].filter(Boolean);

  return parts.join('\n\n');
}

export function buildOllamaPlainTextInstructions(): string {
  return 'Respond with only the translated text for the line below. Do not include the original text, line numbers, JSON, explanations, notes, or quotes.';
}

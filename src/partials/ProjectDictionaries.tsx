import { spellcheck } from '@src/services/spellcheck';
import { TLanguage } from '@src/types';
import { getLanguageLocale, useLanguageLabels } from '@src/utils/languageLabels';
import { useAppSelector } from '@store/hooks';
import { AlphaTagList } from '@ui-toolkit/AlphaTagList';
import { FormsRow, FormsSection, FormsSectionContent } from '@ui-toolkit/forms';
import { useMemo } from 'react';

/** The open project's spellcheck dictionaries with words, side by side, their words removable */
export function ProjectDictionaries() {
  const labels = useLanguageLabels();
  const dictionaries = useAppSelector(spellcheck.selectProjectDictionariesWithWords);

  const sections = useMemo(
    () =>
      Object.entries(dictionaries)
        .map(([language, words]) => ({
          language,
          words,
          label: labels[language as TLanguage] ?? language,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [dictionaries, labels]
  );

  return (
    <FormsRow>
      <FormsSection>
        <FormsSectionContent $columns={sections.length > 1 ? 2 : 1}>
          {sections.map(({ language, words, label }) => (
            <AlphaTagList
              key={language}
              label={label}
              dictionary={words}
              locale={getLanguageLocale(language)}
              onRemove={(word) => void spellcheck.removeFromProjectDictionary(language, word)}
            />
          ))}
        </FormsSectionContent>
      </FormsSection>
    </FormsRow>
  );
}

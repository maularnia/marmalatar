import { spellcheck } from '@src/services/spellcheck';
import { ThemeColors } from '@src/theme/utils';
import { TLanguage } from '@src/types';
import { getLanguageLocale, useLanguageLabels } from '@src/utils/languageLabels';
import { useAppSelector } from '@store/hooks';
import { AlphaTagList } from '@ui-toolkit/AlphaTagList';
import { FormsRow, FormsSection } from '@ui-toolkit/forms';
import P, { TPVariant } from '@ui-toolkit/P';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/** Every global spellcheck dictionary with words, one row per language, its words removable */
export function GlobalDictionaries() {
  const { t } = useTranslation('settings');
  const labels = useLanguageLabels();
  const dictionaries = useAppSelector(spellcheck.selectGlobalDictionaries);

  // Sorted by language name. A code this build doesn't know (a file from a newer one) is shown as is.
  const sections = useMemo(
    () =>
      Object.entries(dictionaries)
        .filter(([, words]) => words.length)
        .map(([language, words]) => ({
          language,
          words,
          label: labels[language as TLanguage] ?? language,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [dictionaries, labels]
  );

  if (!sections.length) {
    return (
      <P color={ThemeColors.TEXT} variant={TPVariant.TERTIARY}>
        {t('spellcheck.dictionariesEmpty')}
      </P>
    );
  }

  return (
    <FormsRow>
      {sections.map(({ language, words, label }) => (
        <FormsSection key={language}>
          <AlphaTagList
            label={label}
            dictionary={words}
            locale={getLanguageLocale(language)}
            onRemove={(word) => void spellcheck.removeFromGlobalDictionary(language, word)}
          />
        </FormsSection>
      ))}
    </FormsRow>
  );
}

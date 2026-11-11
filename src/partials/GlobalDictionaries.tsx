import { spellcheck } from '@src/services/spellcheck';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { TLanguage } from '@src/types';
import { useLanguageLabels } from '@src/utils/languageLabels';
import { useAppSelectors } from '@store/hooks';
import { FormsRow, FormsSection, FormsSectionContent, FormsSectionTitle } from '@ui-toolkit/forms';
import P, { TPVariant } from '@ui-toolkit/P';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const Words = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${CSSVar('size4')};
`;

/** Every global spellcheck dictionary, one section per language, its words removable one by one */
export function GlobalDictionaries() {
  const { t } = useTranslation('settings');
  const labels = useLanguageLabels();
  const [languages, dictionaries] = useAppSelectors(
    spellcheck.selectAvailableDictionaries,
    spellcheck.selectGlobalDictionaries
  );

  // A code this build doesn't know (a file from a newer one) is shown as is. Words are sorted by
  // their own language's alphabet (BE_be → be: і after и, ў after у), ignoring letter case.
  const sections = useMemo(
    () =>
      languages
        .map((language) => {
          const collator = new Intl.Collator(language.split('_')[1], {
            sensitivity: 'base',
            numeric: true,
          });
          return {
            language,
            label: labels[language as TLanguage] ?? language,
            words: [...(dictionaries[language] ?? [])].sort(collator.compare),
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label)),
    [languages, dictionaries, labels]
  );

  if (!sections.length) {
    return (
      <FormsRow>
        <P color={ThemeColors.TEXT} variant={TPVariant.TERTIARY}>
          {t('spellcheck.dictionariesEmpty')}
        </P>
      </FormsRow>
    );
  }

  return (
    <>
      {sections.map(({ language, label, words }) => (
        <FormsRow key={language}>
          <FormsSection>
            <FormsSectionTitle>{label}</FormsSectionTitle>
            <FormsSectionContent>
              <Words>
                {words.map((word) => (
                  <Tag
                    key={word}
                    variant={TTagVariant.SECONDARY}
                    size={TTagSize.SMALL}
                    color={ThemeColors.TEXT}
                    onRemove={() => void spellcheck.removeFromGlobalDictionary(language, word)}
                  >
                    {word}
                  </Tag>
                ))}
              </Words>
            </FormsSectionContent>
          </FormsSection>
        </FormsRow>
      ))}
    </>
  );
}

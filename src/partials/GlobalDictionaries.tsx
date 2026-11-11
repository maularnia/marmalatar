import { spellcheck } from '@src/services/spellcheck';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { TLanguage } from '@src/types';
import { useLanguageLabels } from '@src/utils/languageLabels';
import { useAppSelectors } from '@store/hooks';
import { FormsRow, FormsSection, FormsSectionContent, FormsSectionTitle } from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
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

  // A code this build doesn't know (a file from a newer one) is shown as is
  const sections = useMemo(
    () =>
      languages
        .map((language) => ({ language, label: labels[language as TLanguage] ?? language }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [languages, labels]
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
      {sections.map(({ language, label }) => (
        <FormsRow key={language}>
          <FormsSection>
            <FormsSectionTitle icon={TIcon.LANGUAGE}>{label}</FormsSectionTitle>
            <FormsSectionContent>
              <Words>
                {[...(dictionaries[language] ?? [])]
                  .sort((a, b) => a.localeCompare(b))
                  .map((word) => (
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

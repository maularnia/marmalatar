import { GlossaryKeystrokeProvider } from '@providers/GlossaryKeystrokeProvider';
import type { AIGlossaryFileDataType } from '@src/utils/data/schemas';
import { TLanguage } from '@src/types';
import { useLanguageOptions } from '@src/utils/languageLabels';
import { useAppSelectors } from '@store/hooks';
import { glossaries } from '@src/services/glossary';
import Button from '@ui-toolkit/Button/Button';
import { TButtonVariant } from '@ui-toolkit/Button/types';
import {
  FormsContent,
  FormsRow,
  FormsSection,
  FormsSectionContent,
  FormsSectionTitle,
} from '@ui-toolkit/forms';
import Icon from '@ui-toolkit/Icon/Icon';
import { TIcon, TIconSize } from '@ui-toolkit/Icon/icons';
import Select from '@ui-toolkit/Select/Select';
import { FALLBACK_EMOJI } from '@utils/emoji';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import GlossaryTableHeader from './GlossaryTable/GlossaryTableHeader';
import GlossaryTableLine from './GlossaryTable/GlossaryTableLine';
import { EGlossaryTable } from './GlossaryTable/partials';
import Overlay from '../Overlay';

const emptyFormData: AIGlossaryFileDataType = {
  version: 1,
  title: '',
  emoji: FALLBACK_EMOJI,
  sourceLanguage: TLanguage.English,
  targetLanguage: TLanguage.Belarusian,
  list: [],
};

export default function GlossaryOverlay() {
  const { t } = useTranslation(['glossary', 'tooltips', 'messages']);
  const languageOptions = useLanguageOptions();
  const [currentGlossary, glossaryData] = useAppSelectors(
    glossaries.selectCurrent,
    glossaries.selectData
  );

  const formData = glossaryData ?? emptyFormData;

  // Languages are part of the file header, which only the main process writes: they're saved right
  // away rather than with the pairs on close
  const handleLanguagesChange = useCallback(
    (sourceLanguage: TLanguage, targetLanguage: TLanguage) => {
      if (!currentGlossary) return;
      void glossaries.updateLanguages(currentGlossary, sourceLanguage, targetLanguage);
    },
    [currentGlossary]
  );
  const handleRowChange = useCallback(
    (index: number, field: 'original' | 'translation', value: string) => {
      const list = formData.list.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      );
      glossaries.setData({ ...formData, list });
    },
    [formData]
  );

  const handleAddRow = useCallback(() => {
    glossaries.insertPair(formData.list.length - 1, 'after');
  }, [formData.list.length]);

  if (!currentGlossary) return null;

  return (
    <Overlay title={t('glossary:overlayTitle')} onClose={() => void glossaries.saveAndClose()}>
      <GlossaryKeystrokeProvider>
        <FormsContent>
          <FormsRow>
            <FormsSection>
              <FormsSectionTitle icon={TIcon.LANGUAGE} subtext={t('translationDirection.subtext')}>
                {t('translationDirection.title')}
              </FormsSectionTitle>
              <FormsSectionContent $columns={3} $templateColumns={'1fr min-content 1fr'}>
                <Select
                  options={languageOptions}
                  value={formData.sourceLanguage}
                  onChange={([v]) =>
                    handleLanguagesChange(
                      (v as TLanguage) ?? TLanguage.English,
                      formData.targetLanguage
                    )
                  }
                />
                <Icon icon={TIcon.ARROW_RIGHT} size={TIconSize.L} style={{ alignSelf: 'center' }} />
                <Select
                  options={languageOptions}
                  value={formData.targetLanguage}
                  onChange={([v]) =>
                    handleLanguagesChange(
                      formData.sourceLanguage,
                      (v as TLanguage) ?? TLanguage.Belarusian
                    )
                  }
                />
              </FormsSectionContent>
            </FormsSection>
          </FormsRow>

          <FormsRow>
            <FormsSection>
              <FormsSectionTitle icon={TIcon.GLOSSARY}>{t('entries.title')}</FormsSectionTitle>
              <FormsSectionContent>
                <EGlossaryTable>
                  <GlossaryTableHeader />
                  {formData.list.map((entry, index) => (
                    <GlossaryTableLine
                      key={entry.original + entry.translation}
                      pairIndex={index}
                      original={entry.original}
                      translation={entry.translation}
                      sourceLanguage={formData.sourceLanguage}
                      targetLanguage={formData.targetLanguage}
                      onFocus={(column) => glossaries.setFocusedPair({ pairIndex: index, column })}
                      onOriginalChange={(v) => handleRowChange(index, 'original', v)}
                      onTranslationChange={(v) => handleRowChange(index, 'translation', v)}
                      onDelete={() => void glossaries.deletePair(index)}
                      onInsertBefore={() => glossaries.insertPair(index, 'before')}
                      onInsertAfter={() => glossaries.insertPair(index, 'after')}
                    />
                  ))}
                </EGlossaryTable>
              </FormsSectionContent>
              {formData.list.length === 0 && (
                <FormsSectionContent>
                  <Button
                    style={{ justifySelf: 'center' }}
                    variant={TButtonVariant.TRANSPARENT}
                    icon={TIcon.PLUS}
                    onClick={handleAddRow}
                  >
                    {t('entries.addButton')}
                  </Button>
                </FormsSectionContent>
              )}
            </FormsSection>
          </FormsRow>
        </FormsContent>
      </GlossaryKeystrokeProvider>
    </Overlay>
  );
}

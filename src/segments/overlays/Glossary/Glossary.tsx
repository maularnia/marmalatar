import { useInfoWindow } from '@providers/ConfirmationProvider/ConfirmationProvider';
import GlossaryKeyStrokeProvider from '@providers/GlossaryKeyStrokeProvider';
import { useGlossaryActions } from '@providers/GlossaryActionsProvider';
import { Loader } from '@src/segments/dialogs/Loader';
import type { AIGlossaryFileDataType } from '@src/utils/data/schemas';
import { TLanguage } from '@src/types';
import { useLanguageOptions } from '@src/utils/languageLabels';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import {
  selectCurrentGlossary,
  selectGlossaryData,
  setGlossaryData,
} from '@store/slices/aiPromptEditor';
import { closeOverlays } from '@store/slices/overlays';
import { saveGlossary } from '@store/thunks';
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
  const dispatch = useAppDispatch();
  const currentGlossary = useAppSelector(selectCurrentGlossary);
  const glossaryData = useAppSelector(selectGlossaryData);
  const { show: showLoading } = useInfoWindow(Loader);
  const { handleSetFocusedPair, handleInsertPair, handleDeletePair } = useGlossaryActions();

  const formData = glossaryData ?? emptyFormData;

  const handleChange = useCallback(
    <K extends keyof AIGlossaryFileDataType>(field: K, value: AIGlossaryFileDataType[K]) => {
      dispatch(setGlossaryData({ ...formData, [field]: value }));
    },
    [dispatch, formData]
  );
  const handleRowChange = useCallback(
    (index: number, field: 'original' | 'translation', value: string) => {
      const list = formData.list.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      );
      dispatch(setGlossaryData({ ...formData, list }));
    },
    [dispatch, formData]
  );

  const handleAddRow = useCallback(() => {
    handleInsertPair(formData.list.length - 1, 'after');
  }, [handleInsertPair, formData.list.length]);

  const handleClose = async () => {
    await showLoading(
      {
        message: t('messages:glossary.savingLabel', { title: formData.title || '...' }),
        animate: false,
      },
      dispatch(saveGlossary()) as Promise<unknown>
    );
    dispatch(closeOverlays());
  };
  if (!currentGlossary) return null;

  return (
    <Overlay onClose={() => void handleClose()}>
      <GlossaryKeyStrokeProvider>
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
                    handleChange('sourceLanguage', (v as TLanguage) ?? TLanguage.English)
                  }
                />
                <Icon icon={TIcon.ARROW_RIGHT} size={TIconSize.L} style={{ alignSelf: 'center' }} />
                <Select
                  options={languageOptions}
                  value={formData.targetLanguage}
                  onChange={([v]) =>
                    handleChange('targetLanguage', (v as TLanguage) ?? TLanguage.Belarusian)
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
                      key={index}
                      pairIndex={index}
                      original={entry.original}
                      translation={entry.translation}
                      sourceLanguage={formData.sourceLanguage}
                      targetLanguage={formData.targetLanguage}
                      onFocus={(column) => handleSetFocusedPair(index, column)}
                      onOriginalChange={(v) => handleRowChange(index, 'original', v)}
                      onTranslationChange={(v) => handleRowChange(index, 'translation', v)}
                      onDelete={() => handleDeletePair(index)}
                      onInsertBefore={() => handleInsertPair(index, 'before')}
                      onInsertAfter={() => handleInsertPair(index, 'after')}
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
      </GlossaryKeyStrokeProvider>
    </Overlay>
  );
}

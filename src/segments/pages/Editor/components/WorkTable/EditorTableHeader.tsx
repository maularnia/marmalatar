import { editor } from '@src/services/project';
import Select from '@ui-toolkit/Select/Select';
import { useAppSelectors } from '@src/store/hooks';
import { projects } from '@src/services/project';
import { CSSVar } from '@src/theme/utils';
import { TLanguage } from '@src/types';
import { useLanguageOptions } from '@src/utils/languageLabels';
import { glossaries } from '@src/services/glossary';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

// The background and blur fade out from top (full) to bottom (none). backdrop-filter can't be
// graded itself, so both live on a pseudo-element under the cells and a mask fades it -- masking
// the row itself would fade its text too. `isolation` keeps the pseudo-element's negative z-index
// inside the row.
const Row = styled.div`
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: var(--current-grid-template);
  gap: 0;
  align-items: stretch;
  width: 100%;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background-color: ${CSSVar('mainTableHeaderBg')};
    backdrop-filter: ${CSSVar('mainTableHeaderBackdrop')};
    mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
    pointer-events: none;
  }
`;
const Cell = styled.div`
  padding: ${CSSVar('size4')} ${CSSVar('size6')};
  font-family: ${CSSVar('fontTextSansSerif')};
  font-size: ${CSSVar('sizeTextRegular')};
  font-weight: ${CSSVar('bold')};
  color: ${CSSVar('mainTableHeaderColor')};
  background: transparent;
  border-radius: 0;
  display: grid;
  grid-template-columns: 100%;
  align-items: center;
  gap: ${CSSVar('mainTableLineCellSpacingX')};
`;

export const EditorTableHeader = () => {
  const { t } = useTranslation('editor');
  const languageOptions = useLanguageOptions();
  const [sourceLanguage, targetLanguage, isEditMode] = useAppSelectors(
    projects.selectSourceLanguage,
    projects.selectTargetLanguage,
    editor.selectIsEditMode
  );
  return (
    <Row>
      <Cell>
        <Select
          value={sourceLanguage ?? TLanguage.English}
          onChange={([value]) => {
            projects.setSourceLanguage(value as TLanguage);
            glossaries.reconcileSelectionWithDirection();
          }}
          options={languageOptions}
        />
      </Cell>
      <Cell style={{ textAlign: 'center' }}>{t('tableHeader.character')}</Cell>
      {!isEditMode && (
        <Cell style={{ justifyContent: 'flex-end' }}>
          <Select
            value={targetLanguage ?? TLanguage.Belarusian}
            onChange={([value]) => {
              projects.setTargetLanguage(value as TLanguage);
              glossaries.reconcileSelectionWithDirection();
            }}
            options={languageOptions}
          />
        </Cell>
      )}
    </Row>
  );
};

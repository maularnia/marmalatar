import Select from '@ui-toolkit/Select/Select';
import { useAppDispatch, useAppSelector } from '@src/store/hooks';
import { projects } from '@src/store/slices/project';
import { CSSVar } from '@src/theme/utils';
import { TLanguage } from '@src/types';
import { useLanguageOptions } from '@src/utils/languageLabels';
import { glossaries } from '@store/slices/aiPromptEditor';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const Row = styled.div`
  border: ${CSSVar('mainTableLineCellBorderWidth')} solid ${CSSVar('mainTableLineCellBorderColor')};
  border-top: none;
  display: grid;
  grid-template-columns: var(--current-grid-template);
  gap: 0;
  align-items: stretch;
  background-color: ${CSSVar('mainTableHeaderBg')};
  backdrop-filter: ${CSSVar('mainTableHeaderBackdrop')};
  width: 100%;
`;
const Cell = styled.div`
  border-left: ${CSSVar('mainTableLineCellBorderWidth')} solid
    ${CSSVar('mainTableLineCellBorderColor')};
  &:first-child {
    border-left: none;
  }
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
  const dispatch = useAppDispatch();
  const languageOptions = useLanguageOptions();
  const sourceLanguage = useAppSelector(projects.selectSourceLanguage);
  const targetLanguage = useAppSelector(projects.selectTargetLanguage);
  const isEditMode = useAppSelector(projects.selectIsEditMode);
  return (
    <Row>
      <Cell>
        <Select
          value={sourceLanguage ?? TLanguage.English}
          onChange={([value]) => {
            dispatch(projects.setSourceLanguage(value as TLanguage));
            dispatch(glossaries.reconcileSelectionWithDirection());
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
              dispatch(projects.setTargetLanguage(value as TLanguage));
              dispatch(glossaries.reconcileSelectionWithDirection());
            }}
            options={languageOptions}
          />
        </Cell>
      )}
    </Row>
  );
};

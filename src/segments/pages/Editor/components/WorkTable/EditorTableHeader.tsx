import { editor } from '@src/services/project';
import Select from '@ui-toolkit/Select/Select';
import { useAppSelectors } from '@src/store/hooks';
import { projects } from '@src/services/project';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { TLanguage } from '@src/types';
import { useLanguageOptions } from '@src/utils/languageLabels';
import { glossaries } from '@src/services/glossary';
import { ai } from '@src/services/ai';
import Button from '@ui-toolkit/Button/Button';
import { TButtonVariant } from '@ui-toolkit/Button/types';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Tooltip, { TooltipComplex, TooltipKeystrokeHint } from '@ui-toolkit/Tooltip';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

// No background or blur of its own: the floating block it sits in (FloatingVideoBlock.tsx)
// carries them for the whole stack
const Row = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: var(--current-grid-template);
  gap: 0;
  align-items: stretch;
  width: 100%;
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

// A language select followed by the mode button, which keeps its own width
const SelectWithAction = styled.div`
  display: flex;
  align-items: center;
  gap: ${CSSVar('size4')};
  & > :first-child {
    flex: 1 1 auto;
    min-width: 0;
  }
`;

// The character column's title is left-aligned, with the mode button (edit mode only) at the cell's end
const ActorHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  & > :last-child {
    justify-self: end;
  }
`;

// Switches between translating and editing the source (Ctrl+M): removes the translation column
// from its own header, or adds it back from the actor column's
function ModeButton({ isEditMode, disabled }: { isEditMode: boolean; disabled: boolean }) {
  const { t } = useTranslation('tooltips');
  return (
    <Tooltip
      label={
        <TooltipComplex
          title={t(
            isEditMode
              ? 'editorControls.addTranslationColumn'
              : 'editorControls.removeTranslationColumn'
          )}
        >
          <TooltipKeystrokeHint keys={['Ctrl', 'M']} />
        </TooltipComplex>
      }
    >
      <Button
        variant={TButtonVariant.TRANSPARENT}
        color={ThemeColors.TEXT}
        icon={isEditMode ? TIcon.COLUMNS_3 : TIcon.CROSS}
        disabled={disabled}
        onClick={() => editor.toggleEditMode()}
      />
    </Tooltip>
  );
}

type TEditorTableHeaderProps = {
  /** Shows the languages without letting them (or the mode) change: the selects are disabled and
   * there's no mode button. For views over the table that aren't the table itself (Find & Replace) */
  readOnly?: boolean;
};

export const EditorTableHeader = ({ readOnly = false }: TEditorTableHeaderProps) => {
  const { t } = useTranslation('editor');
  const languageOptions = useLanguageOptions();
  const [sourceLanguage, targetLanguage, isEditMode, isBusy] = useAppSelectors(
    projects.selectSourceLanguage,
    projects.selectTargetLanguage,
    editor.selectIsEditMode,
    ai.selectIsBusy
  );
  return (
    <Row>
      <Cell>
        <Select
          value={sourceLanguage ?? TLanguage.English}
          disabled={readOnly}
          onChange={([value]) => {
            projects.setSourceLanguage(value as TLanguage);
            glossaries.reconcileSelectionWithDirection();
          }}
          options={languageOptions}
        />
      </Cell>
      <Cell>
        <ActorHeader>
          <span style={{ textAlign: 'left' }}>{t('tableHeader.character')}</span>
          {isEditMode && !readOnly ? <ModeButton isEditMode disabled={isBusy} /> : <span />}
        </ActorHeader>
      </Cell>
      {!isEditMode && (
        <Cell>
          <SelectWithAction>
            <Select
              value={targetLanguage ?? TLanguage.Belarusian}
              disabled={readOnly}
              onChange={([value]) => {
                projects.setTargetLanguage(value as TLanguage);
                glossaries.reconcileSelectionWithDirection();
              }}
              options={languageOptions}
            />
            {!readOnly && <ModeButton isEditMode={false} disabled={isBusy} />}
          </SelectWithAction>
        </Cell>
      )}
    </Row>
  );
};

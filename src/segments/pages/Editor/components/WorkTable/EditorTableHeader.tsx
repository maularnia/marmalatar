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

// The actor column's title stays centred, with the mode button (edit mode only) at the cell's end
const ActorHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
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

export const EditorTableHeader = () => {
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
          onChange={([value]) => {
            projects.setSourceLanguage(value as TLanguage);
            glossaries.reconcileSelectionWithDirection();
          }}
          options={languageOptions}
        />
      </Cell>
      <Cell>
        <ActorHeader>
          <span />
          <span style={{ textAlign: 'center' }}>{t('tableHeader.character')}</span>
          {isEditMode ? <ModeButton isEditMode disabled={isBusy} /> : <span />}
        </ActorHeader>
      </Cell>
      {!isEditMode && (
        <Cell>
          <SelectWithAction>
            <Select
              value={targetLanguage ?? TLanguage.Belarusian}
              onChange={([value]) => {
                projects.setTargetLanguage(value as TLanguage);
                glossaries.reconcileSelectionWithDirection();
              }}
              options={languageOptions}
            />
            <ModeButton isEditMode={false} disabled={isBusy} />
          </SelectWithAction>
        </Cell>
      )}
    </Row>
  );
};

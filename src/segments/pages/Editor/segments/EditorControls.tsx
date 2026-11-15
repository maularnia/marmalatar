import { projects } from '@src/services/project';
import { media } from '@src/services/media';
import { settings } from '@src/services/settings';
import { editor } from '@src/services/project';
import { glossaries } from '@src/services/glossary';
import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { useAppSelectors } from '@store/hooks';
import { ai } from '@src/services/ai';
import Button from '@ui-toolkit/Button/Button';
import { TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Tooltip, { TooltipComplex, TooltipKeystrokeHint, TooltipSimple } from '@ui-toolkit/Tooltip';
import { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: ${CSSVar('size4')};
  color: white;
`;

// A group of related buttons, set apart from the next one by Container's gap
const PanelSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  backdrop-filter: blur(${CSSVar('blurExtreme')});
  border-radius: ${CSSVar('size12')};
  background: ${CSSColor(ThemeColors.TEXT, TShade.PALE, 5)};
  overflow: hidden;
`;

const AiTranslationProgressBar = styled.div`
  border-radius: ${CSSVar('inputBorderRadius')};
  overflow: hidden;
  position: relative;

  &:before {
    content: '';
    position: absolute;
    height: 100%;
    background: ${CSSColor(ThemeColors.ACCENT1, TShade.DEFAULT, 20)};
    width: var(--translation-progress);
  }
`;

const PanelButton: typeof Button = (props) => {
  return (
    <Button
      color={ThemeColors.TEXT}
      size={TButtonSize.REGULAR}
      variant={TButtonVariant.TRANSPARENT}
      {...props}
    />
  );
};

export function EditorControls() {
  const { t } = useTranslation('tooltips');
  const [integrationIsConfigured, focusedLineIndex, textSelection] = useAppSelectors(
    settings.selectIntegrationIsConfigured,
    editor.selectFocusedLineIndex,
    editor.selectTextSelection
  );
  const [
    currentBulkJob,
    isBusy,
    isSmallScreen,
    isEditMode,
    canUndo,
    canRedo,
    videoPath,
    focusedColumn,
    tempo,
  ] = useAppSelectors(
    ai.selectCurrentBulkJob,
    ai.selectIsBusy,
    settings.selectIsSmallScreen,
    editor.selectIsEditMode,
    editor.selectCanUndo,
    editor.selectCanRedo,
    media.selectVideoFilePath,
    editor.selectFocusedColumn,
    projects.selectTempo
  );
  // Controls that can't be used in the current mode or without an AI integration aren't rendered
  // at all, rather than shown disabled. A running bulk translation keeps its progress and stop
  // button regardless.
  const showAiControls = (integrationIsConfigured && !isEditMode) || currentBulkJob != null;
  const isAiAvailable = !isBusy;
  const isAutoMergeAvailable = !currentBulkJob && !isBusy;

  return (
    <>
      <Container tabIndex={1}>
        <PanelSection>
          <Tooltip
            label={
              <TooltipComplex title={t('editorControls.undo')}>
                <TooltipKeystrokeHint keys={['Ctrl', 'Z']} />
              </TooltipComplex>
            }
            side="right"
          >
            <PanelButton
              disabled={!canUndo || isBusy}
              icon={TIcon.HISTORY_BACK}
              onClick={() => editor.undoRedo('backward')}
            />
          </Tooltip>
          <Tooltip
            label={
              <TooltipComplex title={t('editorControls.redo')}>
                <TooltipKeystrokeHint keys={['Ctrl', 'Shift', 'Z']} />
              </TooltipComplex>
            }
            side="right"
          >
            <PanelButton
              disabled={!canRedo || isBusy}
              icon={TIcon.HISTORY_FORWARD}
              onClick={() => editor.undoRedo('forward')}
            />
          </Tooltip>
        </PanelSection>
        {showAiControls && (
          <PanelSection>
            {/* A running bulk translation takes the place of both translate buttons: its
                progress, with the button that stops it */}
            {currentBulkJob ? (
              <AiTranslationProgressBar
                style={
                  {
                    '--translation-progress': `${((currentBulkJob.completed / currentBulkJob.total) * 100).toFixed(1)}%`,
                  } as CSSProperties
                }
              >
                <PanelButton
                  icon={TIcon.STOP}
                  color={ThemeColors.RED}
                  onClick={() => ai.cancelAutomatedBulk()}
                />
              </AiTranslationProgressBar>
            ) : (
              <>
                <Tooltip
                  side="right"
                  label={
                    <TooltipComplex title={t('editorControls.translateFocusedLine')}>
                      <TooltipKeystrokeHint keys={['Alt', 'T']} />
                    </TooltipComplex>
                  }
                >
                  <PanelButton
                    variant={TButtonVariant.TRANSPARENT_SPECIAL}
                    disabled={!isAiAvailable || focusedLineIndex === null}
                    icon={TIcon.AI_EDIT}
                    onClick={() => {
                      if (focusedLineIndex == null) return;
                      ai.translateLine(focusedLineIndex);
                    }}
                  />
                </Tooltip>
                <Tooltip
                  side="right"
                  label={
                    <TooltipComplex title={t('editorControls.translateAll')}>
                      <TooltipKeystrokeHint keys={['Alt', 'Shift', 'T']} />
                    </TooltipComplex>
                  }
                >
                  <PanelButton
                    variant={TButtonVariant.TRANSPARENT_SPECIAL}
                    disabled={!isAiAvailable}
                    onClick={ai.translateUntranslatedLines}
                    icon={TIcon.AI_FILE}
                  />
                </Tooltip>
              </>
            )}
            <Tooltip
              side="right"
              label={
                <TooltipComplex title={t('editorControls.addSelectedToGlossary')}>
                  <TooltipKeystrokeHint keys={['Alt', 'G']} />
                </TooltipComplex>
              }
            >
              <PanelButton
                icon={TIcon.GLOSSARY}
                disabled={isBusy || textSelection.length <= 0}
                onClick={() => glossaries.addEntryFromText(textSelection)}
              />
            </Tooltip>
          </PanelSection>
        )}
        <PanelSection>
          <Tooltip
            side="right"
            label={
              <TooltipComplex title={t('editorControls.cleanup')}>
                <TooltipKeystrokeHint keys={['Alt', 'H']} />
              </TooltipComplex>
            }
          >
            <PanelButton
              disabled={!isAutoMergeAvailable}
              icon={TIcon.CLEANUP}
              onClick={() => void editor.cleanup()}
            />
          </Tooltip>
          {tempo.enabled && (
            <Tooltip
              side="right"
              label={
                <TooltipComplex title={t('editorControls.autoFixTempo')}>
                  <TooltipKeystrokeHint keys={['Alt', 'Shift', 'F']} />
                </TooltipComplex>
              }
            >
              <PanelButton
                disabled={!isAutoMergeAvailable}
                icon={TIcon.TIME_FIX}
                onClick={() => void editor.autoFixTempo()}
              />
            </Tooltip>
          )}
          {!isEditMode && (
            <>
              <Tooltip
                side="right"
                label={
                  <TooltipComplex title={t('editorControls.copyAllSourceToOutput')}>
                    <TooltipKeystrokeHint keys={['Alt', 'Shift', 'C']} />
                  </TooltipComplex>
                }
              >
                <PanelButton
                  disabled={!isAutoMergeAvailable}
                  icon={TIcon.DOUBLE_RIGHT}
                  onClick={() => void editor.copyAllSourceToOutput()}
                />
              </Tooltip>
              <Tooltip
                side="right"
                label={
                  <TooltipComplex title={t('editorControls.completeAllTranslated')}>
                    <TooltipKeystrokeHint keys={['Alt', 'Shift', 'Enter']} />
                  </TooltipComplex>
                }
              >
                <PanelButton
                  disabled={!isAutoMergeAvailable}
                  icon={TIcon.DOUBLE_TICK}
                  onClick={() => editor.completeAllTranslatedLines()}
                />
              </Tooltip>
            </>
          )}
          <Tooltip
            label={
              <TooltipComplex title={t('editorControls.insertLineBefore')}>
                <TooltipKeystrokeHint keys={['Alt', ',']} />
              </TooltipComplex>
            }
            side="right"
          >
            <PanelButton
              disabled={focusedLineIndex === null || isBusy}
              icon={TIcon.INSERT_BEFORE}
              onClick={() => {
                if (focusedLineIndex !== null) editor.insertLine(focusedLineIndex, 'before');
              }}
            />
          </Tooltip>
          <Tooltip
            label={
              <TooltipComplex title={t('editorControls.insertLineAfter')}>
                <TooltipKeystrokeHint keys={['Alt', '.']} />
              </TooltipComplex>
            }
            side="right"
          >
            <PanelButton
              disabled={focusedLineIndex === null || isBusy}
              icon={TIcon.INSERT_AFTER}
              onClick={() => {
                if (focusedLineIndex !== null) editor.insertLine(focusedLineIndex, 'after');
              }}
            />
          </Tooltip>
        </PanelSection>
        <PanelSection>
          <Tooltip
            side="right"
            label={
              <TooltipComplex title={t('editorControls.splitLineByCursor')}>
                <TooltipKeystrokeHint keys={['Alt', 'R']} />
              </TooltipComplex>
            }
          >
            <PanelButton
              disabled={
                focusedLineIndex === null ||
                (focusedColumn !== 'output' && focusedColumn !== 'source') ||
                isBusy
              }
              icon={TIcon.RAZOR}
              onClick={() => {
                if (focusedLineIndex !== null) {
                  editor.splitLine(focusedLineIndex);
                }
              }}
            />
          </Tooltip>
          {!isEditMode && (
            <Tooltip
              side="right"
              label={
                <TooltipComplex title={t('editorControls.copySourceToOutput')}>
                  <TooltipKeystrokeHint keys={['Alt', 'C']} />
                </TooltipComplex>
              }
              delay={0}
            >
              <PanelButton
                disabled={focusedLineIndex === null || isBusy}
                icon={TIcon.ARROW_COPY_RIGHT}
                onClick={() => {
                  if (focusedLineIndex !== null) {
                    editor.copySourceToOutput(focusedLineIndex);
                  }
                }}
              />
            </Tooltip>
          )}
        </PanelSection>
        <PanelSection>
          <Tooltip
            label={
              <TooltipComplex
                title={
                  isEditMode
                    ? t('editorControls.editModeActive')
                    : t('editorControls.translationModeActive')
                }
              >
                <TooltipKeystrokeHint keys={['Ctrl', 'M']} />
              </TooltipComplex>
            }
            side="right"
          >
            <PanelButton
              color={isEditMode ? ThemeColors.ACCENT2 : ThemeColors.TEXT}
              disabled={isBusy}
              variant={isEditMode ? TButtonVariant.PRIMARY : TButtonVariant.TRANSPARENT}
              icon={isEditMode ? TIcon.COLUMNS_2 : TIcon.COLUMNS_3}
              onClick={() => editor.toggleEditMode()}
            />
          </Tooltip>
          {isSmallScreen && !videoPath && (
            <Tooltip
              label={<TooltipSimple>{t('editorControls.pickVideoFile')}</TooltipSimple>}
              side="right"
            >
              <PanelButton
                color={ThemeColors.ACCENT2}
                disabled={isBusy}
                icon={TIcon.VIDEO_ABSENT}
                onClick={() => void projects.changeVideo()}
              />
            </Tooltip>
          )}
        </PanelSection>
      </Container>
    </>
  );
}

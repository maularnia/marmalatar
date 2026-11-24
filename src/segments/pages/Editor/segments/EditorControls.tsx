import { projects } from '@src/services/project';
import { settings } from '@src/services/settings';
import { editor, findReplace } from '@src/services/project';
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
  const [integrationIsConfigured, focusedLineIndex, textSelection, lineCount] = useAppSelectors(
    settings.selectIntegrationIsConfigured,
    editor.selectFocusedLineIndex,
    editor.selectTextSelection,
    (state) => editor.selectLines(state).length
  );
  const [
    currentBulkJob,
    isBusy,
    isEditMode,
    canUndo,
    canRedo,
    focusedColumn,
    tempo,
    autoMarkLinesCompleted,
    isFindReplaceOpen,
    canReplace,
  ] = useAppSelectors(
    ai.selectCurrentBulkJob,
    ai.selectIsBusy,
    editor.selectIsEditMode,
    editor.selectCanUndo,
    editor.selectCanRedo,
    editor.selectFocusedColumn,
    projects.selectTempo,
    settings.selectAutoMarkLinesCompleted,
    findReplace.selectIsOpen,
    findReplace.selectCanReplace
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
        {!isFindReplaceOpen && (
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
        )}
        {/* Find & Replace. A press here isn't "outside" the overlay (see FindReplaceOverlay), so
            its button can act on it while it's open instead of closing it first */}
        <PanelSection data-find-replace-control>
          {/* One button: opens Find & Replace, closes it while open. Its icon shows the mode the
              overlay is in -- search, or replace once there's a replacement */}
          <Tooltip
            label={
              <TooltipComplex title={t('editorControls.findReplace')}>
                <TooltipKeystrokeHint keys={['Ctrl', 'F']} />
                <TooltipKeystrokeHint keys={['Ctrl', 'R']} />
              </TooltipComplex>
            }
            side="right"
          >
            <PanelButton
              disabled={isBusy}
              color={isFindReplaceOpen ? ThemeColors.ACCENT1 : ThemeColors.TEXT}
              icon={isFindReplaceOpen && canReplace ? TIcon.REPLACE : TIcon.SEARCH}
              onClick={() =>
                isFindReplaceOpen
                  ? findReplace.close({ restoreFocus: true })
                  : findReplace.open({ replace: false })
              }
            />
          </Tooltip>
        </PanelSection>
        {/* Under Find & Replace only its own button is offered: everything else acts on the
            table it covers */}
        {!isFindReplaceOpen && (
          <>
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
            {/* Text and tempo cleanup */}
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
                    icon={TIcon.TEMPO}
                    onClick={() => void editor.autoFixTempo()}
                  />
                </Tooltip>
              )}
            </PanelSection>
            {/* Filling the translation column (translation mode only) */}
            {!isEditMode && (
              <PanelSection>
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
                {/* Marking follows the translation column, like its effect */}
                <Tooltip
                  side="right"
                  label={
                    <TooltipSimple>{t('editorControls.autoMarkLinesCompleted')}</TooltipSimple>
                  }
                >
                  <PanelButton
                    color={autoMarkLinesCompleted ? ThemeColors.GREEN : ThemeColors.TEXT}
                    icon={TIcon.CHECK_CIRCLE_DASHED}
                    onClick={() => settings.setAutoMarkLinesCompleted(!autoMarkLinesCompleted)}
                  />
                </Tooltip>
              </PanelSection>
            )}
            {/* The focused line's structure: insert, merge, cut */}
            <PanelSection>
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
                side="right"
                label={
                  <TooltipComplex title={t('editorControls.mergeWithPrevious')}>
                    <TooltipKeystrokeHint keys={['Alt', 'Shift', '⭡']} />
                  </TooltipComplex>
                }
              >
                <PanelButton
                  disabled={focusedLineIndex === null || focusedLineIndex === 0 || isBusy}
                  icon={TIcon.MERGE_UP}
                  onClick={() => {
                    if (focusedLineIndex !== null) editor.mergeLines(focusedLineIndex, 'up');
                  }}
                />
              </Tooltip>
              <Tooltip
                side="right"
                label={
                  <TooltipComplex title={t('editorControls.mergeWithNext')}>
                    <TooltipKeystrokeHint keys={['Alt', 'Shift', '🠧']} />
                  </TooltipComplex>
                }
              >
                <PanelButton
                  disabled={
                    focusedLineIndex === null || focusedLineIndex >= lineCount - 1 || isBusy
                  }
                  icon={TIcon.MERGE_DOWN}
                  onClick={() => {
                    if (focusedLineIndex !== null) editor.mergeLines(focusedLineIndex, 'down');
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
            </PanelSection>
          </>
        )}
      </Container>
    </>
  );
}

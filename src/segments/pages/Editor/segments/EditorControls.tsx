import { projects } from '@src/services/project';
import { media } from '@src/services/media';
import { settings } from '@src/services/settings';
import { editor } from '@src/services/project';
import { glossaries } from '@src/services/glossary';
import { promptTemplates } from '@src/services/prompt';
import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { useAppSelectors } from '@store/hooks';
import { ai } from '@src/services/ai';
import Button from '@ui-toolkit/Button/Button';
import { TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import Hr, { THrOrient, THrVariant } from '@ui-toolkit/Hr/Hr';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Tooltip, { TooltipComplex, TooltipKeystrokeHint, TooltipSimple } from '@ui-toolkit/Tooltip';
import { type CSSProperties, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  color: white;
`;

const AutomatedTranslationWrapper = styled.div`
  position: relative;
`;

//TODO: remove or upgrade bulk translate job button
const AutomatedTranslationRunner = styled.div`
  position: absolute;
  height: 100%;
  background: ${CSSVar('controlPanelBg')};
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

const AiSectionOptions = styled.div`
  position: fixed;
  display: flex;
  border-radius: 0 ${CSSVar('controlPanelBorderRadius')} ${CSSVar('controlPanelBorderRadius')} 0;
  backdrop-filter: blur(${CSSVar('blurHeavy')});
  background: ${CSSColor(ThemeColors.BG, TShade.DEFAULT, 10)};
  z-index: 4;
`;
const AiSection = styled.div``;

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

// Overlays are exclusive: each owner keeps its own open state, and the caller closes the others
// before opening one.
function openExport(): void {
  promptTemplates.closeEditor();
  glossaries.closeEditor();
  settings.close();
  projects.closeArchive();
  settings.openExport();
}

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
    allLines,
    isSmallScreen,
    isEditMode,
    timeAdjustmentStep,
    canUndo,
    canRedo,
    videoDurationMs,
    videoPath,
    focusedColumn,
  ] = useAppSelectors(
    ai.selectCurrentBulkJob,
    ai.selectIsBusy,
    editor.selectLines,
    settings.selectIsSmallScreen,
    editor.selectIsEditMode,
    settings.selectTimeAdjustmentStep,
    editor.selectCanUndo,
    editor.selectCanRedo,
    media.selectVideoDurationMs,
    media.selectVideoFilePath,
    editor.selectFocusedColumn
  );
  // Controls that can't be used in the current mode or without an AI integration aren't rendered
  // at all, rather than shown disabled. A running bulk translation keeps its progress and stop
  // button regardless.
  const showAiControls = (integrationIsConfigured && !isEditMode) || currentBulkJob != null;
  const isAiAvailable = !isBusy;
  const isAutoMergeAvailable = !currentBulkJob && !isBusy;
  const isExportAvailable = !currentBulkJob && !isBusy;
  const earliestStartTime = allLines.length
    ? Math.min(...allLines.map((line) => line.start_time))
    : 0;
  const latestEndTime = allLines.length ? Math.max(...allLines.map((line) => line.end_time)) : 0;
  const canShiftEarlier = allLines.length > 0 && earliestStartTime > 0;
  const canShiftLater =
    allLines.length > 0 && (videoDurationMs == null || latestEndTime < videoDurationMs);

  const aiSectionRef = useRef<HTMLDivElement>(null);
  const [showAiOptions, setShowAiOptions] = useState(false);

  return (
    <>
      <Container tabIndex={1}>
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
        {showAiControls && (
          <>
            <Hr variant={THrVariant.DIMMED} orientation={THrOrient.HORIZONTAL} />
            <AiSection
              ref={aiSectionRef}
              onMouseEnter={() => setShowAiOptions(true)}
              onMouseLeave={() => setShowAiOptions(false)}
            >
              <AutomatedTranslationWrapper>
                {currentBulkJob && (
                  <AutomatedTranslationRunner
                    style={{
                      width: `${((currentBulkJob.completed / currentBulkJob.total) * 100).toFixed(1)}%`,
                    }}
                  />
                )}
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
                  <PanelButton
                    variant={TButtonVariant.TRANSPARENT_SPECIAL}
                    disabled={!isAiAvailable}
                    icon={TIcon.AI}
                  />
                )}
              </AutomatedTranslationWrapper>
            </AiSection>
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
          </>
        )}
        <Hr variant={THrVariant.DIMMED} orientation={THrOrient.HORIZONTAL} />
        <Tooltip
          label={
            <TooltipComplex
              title={t('editorControls.shiftLinesEarlier', { step: timeAdjustmentStep })}
            >
              <TooltipKeystrokeHint keys={['Alt', 'Shift', 'A']} />
            </TooltipComplex>
          }
          side="right"
        >
          <PanelButton
            disabled={!canShiftEarlier || isBusy}
            icon={TIcon.BACKWARD}
            onClick={() => editor.shiftAllLinesEarlier(timeAdjustmentStep)}
          />
        </Tooltip>
        <Tooltip
          label={
            <TooltipComplex
              title={t('editorControls.shiftLinesLater', { step: timeAdjustmentStep })}
            >
              <TooltipKeystrokeHint keys={['Alt', 'Shift', 'D']} />
            </TooltipComplex>
          }
          side="right"
        >
          <PanelButton
            disabled={!canShiftLater || isBusy}
            icon={TIcon.FORWARD}
            onClick={() => editor.shiftAllLinesLater(timeAdjustmentStep)}
          />
        </Tooltip>
        <Hr variant={THrVariant.DIMMED} orientation={THrOrient.HORIZONTAL} />
        <Tooltip
          label={
            <TooltipComplex title={t('editorControls.autoMergeAdjacentLines')}>
              <TooltipKeystrokeHint keys={['Alt', 'Shift', 'M']} />
            </TooltipComplex>
          }
          side="right"
        >
          <PanelButton
            disabled={!isAutoMergeAvailable}
            onClick={() => void editor.autoMerge()}
            icon={TIcon.MERGE}
          />
        </Tooltip>
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
        <Hr variant={THrVariant.DIMMED} orientation={THrOrient.HORIZONTAL} />
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
        <Hr variant={THrVariant.DIMMED} orientation={THrOrient.HORIZONTAL} />
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
        <Hr variant={THrVariant.DIMMED} orientation={THrOrient.HORIZONTAL} />
        <Tooltip
          side="right"
          label={
            <TooltipComplex title={t('editorControls.export')}>
              <TooltipKeystrokeHint keys={['Ctrl', 'E']} />
            </TooltipComplex>
          }
        >
          <PanelButton
            color={ThemeColors.ACCENT1}
            disabled={!isExportAvailable}
            onClick={openExport}
            icon={TIcon.EXPORT}
          />
        </Tooltip>
      </Container>
      {showAiOptions &&
        !isBusy &&
        integrationIsConfigured &&
        !isEditMode &&
        createPortal(
          <AiSectionOptions
            style={{
              top: aiSectionRef.current?.getBoundingClientRect().top ?? 0,
              left: aiSectionRef.current?.getBoundingClientRect().right ?? 0,
            }}
            onMouseEnter={() => setShowAiOptions(true)}
            onMouseLeave={() => setShowAiOptions(false)}
          >
            <Tooltip
              side="top"
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
            <Tooltip
              side="top"
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
          </AiSectionOptions>,
          document.body
        )}
    </>
  );
}

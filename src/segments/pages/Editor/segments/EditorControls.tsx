import { useEditorActions } from '@providers/EditorActionsProvider';
import { useVideo } from '@providers/VideoProvider';
import { useEditorAIActions } from '@src/providers/EditorAIActionsProvider';
import { useEditorRefs } from '@src/providers/EditorRefsProvider';
import {
  selectIntegrationIsConfigured,
  selectIsSmallScreen,
  selectTimeAdjustmentStep,
} from '@src/store/slices/app';
import {
  selectCanRedo,
  selectCanUndo,
  selectFocusedColumn,
  selectFocusedLineIndex,
  selectLines,
  selectTextSelection,
  shiftAllLinesEarlier,
  shiftAllLinesLater,
} from '@src/store/slices/editor';
import { selectIsEditMode, selectVideoFilePath } from '@src/store/slices/project';
import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import {
  cancelAutomatedBulkTranslation,
  selectCurrentBulkJob,
  selectTranslationIsBusy,
} from '@store/slices/aiTranslation';
import { openExportOverlay } from '@store/thunks';
import Button from '@ui-toolkit/Button/Button';
import { TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import Hr, { THrOrient, THrVariant } from '@ui-toolkit/Hr/Hr';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import Tooltip, { TooltipComplex, TooltipSimple } from '@ui-toolkit/Tooltip';
import { type CSSProperties, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { shallowEqual } from 'react-redux';
import styled from 'styled-components';
import { useVideoFileSwap } from '../components/VideoPlayer/useVideoFileSwap';

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

const TooltipShortcutText = styled.div`
  text-align: center;
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

export function EditorControls() {
  const { t } = useTranslation('tooltips');
  const dispatch = useAppDispatch();
  const { integrationIsConfigured, focusedLineIndex, textSelection } = useAppSelector(
    (state) => ({
      integrationIsConfigured: selectIntegrationIsConfigured(state),
      focusedLineIndex: selectFocusedLineIndex(state),
      textSelection: selectTextSelection(state),
    }),
    shallowEqual
  );
  const { splitCursorRef } = useEditorRefs();
  const {
    handleCopySourceToOutput,
    handleInsertLine,
    handleSplitLine,
    handleAutoMerge,
    handleCleanup,
    handleCopyAllSourceToOutput,
    handleCompleteAllTranslatedLines,
    handleToggleEditMode,
  } = useEditorActions();
  const currentBulkJob = useAppSelector(selectCurrentBulkJob);
  const isBusy = useAppSelector(selectTranslationIsBusy);
  const allLines = useAppSelector(selectLines);
  const isSmallScreen = useAppSelector(selectIsSmallScreen);
  const isEditMode = useAppSelector(selectIsEditMode);
  const isAiAvailable = integrationIsConfigured && !isBusy && !isEditMode;
  const isAutoMergeAvailable = !currentBulkJob && !isBusy;
  const isExportAvailable = !currentBulkJob && !isBusy;
  const timeAdjustmentStep = useAppSelector(selectTimeAdjustmentStep);
  const canUndo = useAppSelector(selectCanUndo);
  const canRedo = useAppSelector(selectCanRedo);
  const { handleUndoRedo } = useEditorActions();
  const { videoDurationMs } = useVideo();
  const videoPath = useAppSelector(selectVideoFilePath);
  const { swapVideo } = useVideoFileSwap();
  const earliestStartTime = allLines.length
    ? Math.min(...allLines.map((line) => line.start_time))
    : 0;
  const latestEndTime = allLines.length ? Math.max(...allLines.map((line) => line.end_time)) : 0;
  const canShiftEarlier = allLines.length > 0 && earliestStartTime > 0;
  const canShiftLater =
    allLines.length > 0 && (videoDurationMs == null || latestEndTime < videoDurationMs);
  const focusedColumn = useAppSelector(selectFocusedColumn);
  const { handleAiTranslate, handleAiTranslateBulk, handleAddToGlossary } = useEditorAIActions();

  const aiSectionRef = useRef<HTMLDivElement>(null);
  const [showAiOptions, setShowAiOptions] = useState(false);

  return (
    <>
      <Container tabIndex={1}>
        <Tooltip
          label={
            <TooltipComplex title={t('editorControls.undo')}>
              <TooltipShortcutText>
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Ctrl
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Z
                </Tag>
              </TooltipShortcutText>
            </TooltipComplex>
          }
          side="right"
        >
          <PanelButton
            disabled={!canUndo || isBusy}
            icon={TIcon.HISTORY_BACK}
            onClick={() => handleUndoRedo('backward')}
          />
        </Tooltip>
        <Tooltip
          label={
            <TooltipComplex title={t('editorControls.redo')}>
              <TooltipShortcutText>
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Ctrl
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Shift
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Z
                </Tag>
              </TooltipShortcutText>
            </TooltipComplex>
          }
          side="right"
        >
          <PanelButton
            disabled={!canRedo || isBusy}
            icon={TIcon.HISTORY_FORWARD}
            onClick={() => handleUndoRedo('forward')}
          />
        </Tooltip>
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
                  onClick={() => dispatch(cancelAutomatedBulkTranslation())}
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
              <TooltipShortcutText>
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Alt
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  G
                </Tag>
              </TooltipShortcutText>
            </TooltipComplex>
          }
        >
          <PanelButton
            icon={TIcon.GLOSSARY}
            disabled={!integrationIsConfigured || isBusy || isEditMode || textSelection.length <= 0}
            onClick={() => handleAddToGlossary(textSelection)}
          />
        </Tooltip>
        <Hr variant={THrVariant.DIMMED} orientation={THrOrient.HORIZONTAL} />
        <Tooltip
          label={
            <TooltipComplex
              title={t('editorControls.shiftLinesEarlier', { step: timeAdjustmentStep })}
            >
              <TooltipShortcutText>
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Alt
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Shift
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  A
                </Tag>
              </TooltipShortcutText>
            </TooltipComplex>
          }
          side="right"
        >
          <PanelButton
            disabled={!canShiftEarlier || isBusy}
            icon={TIcon.BACKWARD}
            onClick={() => dispatch(shiftAllLinesEarlier(timeAdjustmentStep))}
          />
        </Tooltip>
        <Tooltip
          label={
            <TooltipComplex
              title={t('editorControls.shiftLinesLater', { step: timeAdjustmentStep })}
            >
              <TooltipShortcutText>
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Alt
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Shift
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  D
                </Tag>
              </TooltipShortcutText>
            </TooltipComplex>
          }
          side="right"
        >
          <PanelButton
            disabled={!canShiftLater || isBusy}
            icon={TIcon.FORWARD}
            onClick={() => dispatch(shiftAllLinesLater(timeAdjustmentStep))}
          />
        </Tooltip>
        <Hr variant={THrVariant.DIMMED} orientation={THrOrient.HORIZONTAL} />
        <Tooltip
          label={
            <TooltipComplex title={t('editorControls.autoMergeAdjacentLines')}>
              <TooltipShortcutText>
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Alt
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Shift
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  M
                </Tag>
              </TooltipShortcutText>
            </TooltipComplex>
          }
          side="right"
        >
          <PanelButton
            disabled={!isAutoMergeAvailable}
            onClick={() => void handleAutoMerge()}
            icon={TIcon.MERGE}
          />
        </Tooltip>
        <Tooltip
          side="right"
          label={
            <TooltipComplex title={t('editorControls.cleanup')}>
              <TooltipShortcutText>
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Alt
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  H
                </Tag>
              </TooltipShortcutText>
            </TooltipComplex>
          }
        >
          <PanelButton
            disabled={!isAutoMergeAvailable}
            icon={TIcon.CLEANUP}
            onClick={() => void handleCleanup()}
          />
        </Tooltip>
        <Tooltip
          side="right"
          label={
            <TooltipComplex title={t('editorControls.copyAllSourceToOutput')}>
              <TooltipShortcutText>
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Alt
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Shift
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  C
                </Tag>
              </TooltipShortcutText>
            </TooltipComplex>
          }
        >
          <PanelButton
            disabled={!isAutoMergeAvailable || isEditMode}
            icon={TIcon.DOUBLE_RIGHT}
            onClick={() => void handleCopyAllSourceToOutput()}
          />
        </Tooltip>
        <Tooltip
          side="right"
          label={
            <TooltipComplex title={t('editorControls.completeAllTranslated')}>
              <TooltipShortcutText>
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Alt
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Shift
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Enter
                </Tag>
              </TooltipShortcutText>
            </TooltipComplex>
          }
        >
          <PanelButton
            disabled={!isAutoMergeAvailable}
            icon={TIcon.DOUBLE_TICK}
            onClick={() => handleCompleteAllTranslatedLines()}
          />
        </Tooltip>
        <Tooltip
          label={
            <TooltipComplex title={t('editorControls.insertLineBefore')}>
              <TooltipShortcutText>
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Alt
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  ,
                </Tag>
              </TooltipShortcutText>
            </TooltipComplex>
          }
          side="right"
        >
          <PanelButton
            disabled={focusedLineIndex === null || isBusy}
            icon={TIcon.INSERT_BEFORE}
            onClick={() => {
              if (focusedLineIndex !== null) handleInsertLine(focusedLineIndex, 'before');
            }}
          />
        </Tooltip>
        <Tooltip
          label={
            <TooltipComplex title={t('editorControls.insertLineAfter')}>
              <TooltipShortcutText>
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Alt
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  .
                </Tag>
              </TooltipShortcutText>
            </TooltipComplex>
          }
          side="right"
        >
          <PanelButton
            disabled={focusedLineIndex === null || isBusy}
            icon={TIcon.INSERT_AFTER}
            onClick={() => {
              if (focusedLineIndex !== null) handleInsertLine(focusedLineIndex, 'after');
            }}
          />
        </Tooltip>
        <Hr variant={THrVariant.DIMMED} orientation={THrOrient.HORIZONTAL} />
        <Tooltip
          side="right"
          label={
            <TooltipComplex title={t('editorControls.splitLineByCursor')}>
              <TooltipShortcutText>
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Alt
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  R
                </Tag>
              </TooltipShortcutText>
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
                handleSplitLine(focusedLineIndex, splitCursorRef.current);
              }
            }}
          />
        </Tooltip>
        <Tooltip
          side="right"
          label={
            <TooltipComplex title={t('editorControls.copySourceToOutput')}>
              <TooltipShortcutText>
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Alt
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  C
                </Tag>
              </TooltipShortcutText>
            </TooltipComplex>
          }
          delay={0}
        >
          <PanelButton
            disabled={focusedLineIndex === null || isBusy || isEditMode}
            icon={TIcon.ARROW_COPY_RIGHT}
            onClick={() => {
              if (focusedLineIndex !== null) {
                handleCopySourceToOutput(focusedLineIndex);
              }
            }}
          />
        </Tooltip>
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
              <TooltipShortcutText>
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Ctrl
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  M
                </Tag>
              </TooltipShortcutText>
            </TooltipComplex>
          }
          side="right"
        >
          <PanelButton
            color={isEditMode ? ThemeColors.ACCENT2 : ThemeColors.TEXT}
            disabled={isBusy}
            variant={isEditMode ? TButtonVariant.PRIMARY : TButtonVariant.TRANSPARENT}
            icon={isEditMode ? TIcon.COLUMNS_2 : TIcon.COLUMNS_3}
            onClick={() => handleToggleEditMode()}
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
              onClick={swapVideo}
            />
          </Tooltip>
        )}
        <Hr variant={THrVariant.DIMMED} orientation={THrOrient.HORIZONTAL} />
        <Tooltip
          side="right"
          label={
            <TooltipComplex title={t('editorControls.export')}>
              <TooltipShortcutText>
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  Ctrl
                </Tag>
                {' + '}
                <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO}>
                  E
                </Tag>
              </TooltipShortcutText>
            </TooltipComplex>
          }
        >
          <PanelButton
            color={ThemeColors.ACCENT1}
            disabled={!isExportAvailable}
            onClick={() => dispatch(openExportOverlay())}
            icon={TIcon.EXPORT}
          />
        </Tooltip>
      </Container>
      {showAiOptions &&
        !isBusy &&
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
                  <TooltipShortcutText>
                    <Tag
                      variant={TTagVariant.SECONDARY}
                      color={ThemeColors.TEXT}
                      size={TTagSize.NANO}
                    >
                      Alt
                    </Tag>
                    {' + '}
                    <Tag
                      variant={TTagVariant.SECONDARY}
                      color={ThemeColors.TEXT}
                      size={TTagSize.NANO}
                    >
                      Shift
                    </Tag>
                    {' + '}
                    <Tag
                      variant={TTagVariant.SECONDARY}
                      color={ThemeColors.TEXT}
                      size={TTagSize.NANO}
                    >
                      T
                    </Tag>
                  </TooltipShortcutText>
                </TooltipComplex>
              }
            >
              <PanelButton
                variant={TButtonVariant.TRANSPARENT_SPECIAL}
                disabled={!isAiAvailable}
                onClick={handleAiTranslateBulk}
                icon={TIcon.AI_FILE}
              />
            </Tooltip>
            <Tooltip
              side="top"
              label={
                <TooltipComplex title={t('editorControls.translateFocusedLine')}>
                  <TooltipShortcutText>
                    <Tag
                      variant={TTagVariant.SECONDARY}
                      color={ThemeColors.TEXT}
                      size={TTagSize.NANO}
                    >
                      Alt
                    </Tag>
                    {' + '}
                    <Tag
                      variant={TTagVariant.SECONDARY}
                      color={ThemeColors.TEXT}
                      size={TTagSize.NANO}
                    >
                      T
                    </Tag>
                  </TooltipShortcutText>
                </TooltipComplex>
              }
            >
              <PanelButton
                variant={TButtonVariant.TRANSPARENT_SPECIAL}
                disabled={!isAiAvailable || focusedLineIndex === null}
                icon={TIcon.AI_EDIT}
                onClick={() => {
                  if (focusedLineIndex == null) return;
                  handleAiTranslate(focusedLineIndex);
                }}
              />
            </Tooltip>
          </AiSectionOptions>,
          document.body
        )}
    </>
  );
}

import { editor, projects } from '@src/services/project';
import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { getTempoNeighbourStats, getTempoStats } from '@utils/tempo';
import { useAppSelectors } from '@store/hooks';
import Hr, { THrOrient } from '@ui-toolkit/Hr/Hr';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import Tooltip, { TooltipComplex, TooltipSimple } from '@ui-toolkit/Tooltip';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const TempoStats = styled.div`
  display: flex;
  align-items: center;
  padding: ${CSSVar('size2')} 0 ${CSSVar('size2')} ${CSSVar('size6')};
  font-family: ${CSSVar('fontTextSansSerif')};
  font-size: ${CSSVar('sizeTextSmall')};
  line-height: ${CSSVar('buttonHeightSmall')};
  font-weight: ${CSSVar('inputTextWeightSmall')};
  white-space: nowrap;
`;

// Stretches to the panel's height (the buttons may stack on large screens), with some air
const Separator = styled(Hr)`
  align-self: stretch;
  margin: ${CSSVar('size6')};
`;

const Stat = styled.span`
  color: ${CSSColor(ThemeColors.GREEN, TShade.DEFAULT, 100)};
  &.isBroken {
    color: ${CSSColor(ThemeColors.RED, TShade.DEFAULT, 100)};
  }
`;

// Hovered only for their tooltips, so no pointer cursor
const PanelTag = styled(Tag)`
  cursor: default;
`;

const formatSeconds = (ms: number) => (ms / 1000).toFixed(2);
const formatCps = (cps: number) => (Number.isFinite(cps) ? cps.toFixed(1) : '∞');

type TLineTempoStatsProps = {
  lineIndex: number;
};

/** The line's tempo rules, shown at the start of the focused line's panel and followed by a
 * separator before its buttons. Renders nothing while the project's tempo check is off. */
export function LineTempoStats({ lineIndex }: TLineTempoStatsProps) {
  const { t } = useTranslation('editor');
  const [lines, tempo, isEditMode] = useAppSelectors(
    editor.selectLines,
    projects.selectTempo,
    editor.selectIsEditMode
  );

  const line = lines[lineIndex];
  if (!tempo.enabled || !line) return null;

  // The column measured is the one being edited in the current mode, same as the row's own check
  const text = isEditMode ? line.input : line.output;
  const stats = getTempoStats(text, line.start_time, line.end_time, tempo);
  const neighbours = getTempoNeighbourStats(lines, lineIndex, tempo);
  const seconds = t('tempoPanel.seconds');
  // Both neighbours too close read as one marker rather than two side by side. The previous line
  // collides with this one's top edge, the next with its bottom.
  const collision =
    neighbours.tooCloseToPrevious && neighbours.tooCloseToNext
      ? { icon: TIcon.COLLIDE_BOTH, label: t('tempoPanel.tooCloseToNeighbours') }
      : neighbours.tooCloseToPrevious
        ? { icon: TIcon.COLLIDE_TOP, label: t('tempoPanel.tooCloseToPrevious') }
        : neighbours.tooCloseToNext
          ? { icon: TIcon.COLLIDE_BOTTOM, label: t('tempoPanel.tooCloseToNext') }
          : null;

  return (
    <>
      <TempoStats>
        {/* Line count and duration only matter once broken; reading speed is always shown */}
        {!stats.lines.ok && (
          <Stat className="isBroken">
            {t('tempoPanel.lines')}: {stats.lines.value}/{stats.lines.limit}
          </Stat>
        )}
        {!stats.durationMs.ok && (
          <Tooltip
            label={
              <TooltipComplex title={t('tempoPanel.durationTooShort')}>
                {formatSeconds(stats.durationMs.value)}
                {seconds}/{formatSeconds(stats.durationMs.limit)}
                {seconds}
              </TooltipComplex>
            }
          >
            <PanelTag
              variant={TTagVariant.TRANSPARENT}
              size={TTagSize.SMALL}
              icon={TIcon.TIME_SPAN}
              color={ThemeColors.RED}
            />
          </Tooltip>
        )}
        <Tooltip
          label={
            stats.charsPerSecond.ok ? (
              <TooltipSimple>{t('tempoPanel.cps')}</TooltipSimple>
            ) : (
              <TooltipComplex title={t('tempoPanel.cps')}>
                {t('tempoPanel.cpsTooHigh')}
              </TooltipComplex>
            )
          }
        >
          <PanelTag
            variant={TTagVariant.TRANSPARENT}
            size={TTagSize.SMALL}
            icon={stats.charsPerSecond.ok ? TIcon.TIME_OK : TIcon.TIME_ERROR}
            color={stats.charsPerSecond.ok ? ThemeColors.GREEN : ThemeColors.RED}
          >
            {formatCps(stats.charsPerSecond.value)}/{stats.charsPerSecond.limit}
          </PanelTag>
        </Tooltip>
        {collision && (
          <Tooltip label={<TooltipSimple>{collision.label}</TooltipSimple>}>
            <PanelTag
              variant={TTagVariant.TRANSPARENT}
              size={TTagSize.SMALL}
              icon={collision.icon}
              color={ThemeColors.RED}
            />
          </Tooltip>
        )}
      </TempoStats>
      <Separator orientation={THrOrient.VERTICAL} />
    </>
  );
}

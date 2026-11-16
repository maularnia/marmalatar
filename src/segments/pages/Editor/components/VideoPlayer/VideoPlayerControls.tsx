import { editor } from '@src/services/project';
import { settings } from '@src/services/settings';
import type { TColor } from '@src/theme/definitions';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { useAppSelector } from '@store/hooks';
import Button from '@ui-toolkit/Button/Button';
import { TButtonVariant } from '@ui-toolkit/Button/types';
import { TIcon } from '@ui-toolkit/Icon/icons';
import TextInput from '@ui-toolkit/TextInput';
import Tooltip, { TooltipComplex, TooltipKeystrokeHint, TooltipSimple } from '@ui-toolkit/Tooltip';
import { useForm } from 'react-hook-form';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';

// The settings that live in the video player's control bar. Their inputs carry no label, which would
// crowd the bar: a tooltip names them instead (and doubles as the input's accessible name).

const INPUT_WIDTH = '96px';

type TNumberInputProps = {
  label: string;
  icon: TIcon;
  value: number;
  onValidChange: (value: number) => void;
};

// A whole-number (>= 1) input, applied as soon as it's valid; an invalid value shows its error and
// never reaches the store
function TopBarNumberInput({ label, icon, value, onValidChange }: TNumberInputProps) {
  const { t } = useTranslation('errors');
  const {
    register,
    formState: { errors },
  } = useForm({ values: { value }, mode: 'onChange' });
  return (
    <Tooltip label={<TooltipSimple>{label}</TooltipSimple>}>
      <div>
        <TextInput
          icon={icon}
          aria-label={label}
          wrapperProps={{ style: { width: INPUT_WIDTH } }}
          errors={errors.value ? [errors.value.message] : []}
          {...register('value', {
            required: t('settings.timeAdjustmentStepRequired'),
            min: { value: 1, message: t('settings.timeAdjustmentStepMin') },
            valueAsNumber: true,
            onChange: (e) => {
              const v = parseInt(e.currentTarget.value, 10);
              if (Number.isInteger(v) && v >= 1) onValidChange(v);
            },
          })}
        />
      </div>
    </Tooltip>
  );
}

/** How far the timing buttons move lines, in ms */
export function TimeAdjustmentStepInput() {
  const { t } = useTranslation('editor');
  const step = useAppSelector(settings.selectTimeAdjustmentStep);
  return (
    <TopBarNumberInput
      label={t('videoPlayer.timeAdjustmentStep')}
      icon={TIcon.MOVE_X}
      value={step}
      onValidChange={(v) => settings.setTimeAdjustmentStep(v)}
    />
  );
}

// h:mm:ss, or m:ss under an hour
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${minutes}:${seconds}`;
}

const DurationText = styled.span`
  align-self: center;
  font-family: ${CSSVar('fontTextSansSerif')};
  font-size: ${CSSVar('sizeTextSmall')};
  white-space: nowrap;
`;

/** Without a video, the length the timeline assumes (the last line's end plus 30 seconds), as
 * plain text */
export function TimelineDurationText() {
  const { t } = useTranslation('editor');
  const durationMs = useAppSelector(editor.selectTimelineDurationMs);
  if (durationMs == null) return null;
  return (
    <DurationText>{t('videoPlayer.duration', { time: formatDuration(durationMs) })}</DurationText>
  );
}

/** Whether playing scrolls the video into view (small screens, where it can scroll away): green
 * while on */
export function ScrollIntoViewButton({ offColor }: { offColor: TColor }) {
  const { t } = useTranslation('editor');
  const isOn = useAppSelector(settings.selectScrollVideoIntoViewOnPlay);
  return (
    <Tooltip
      label={
        <TooltipComplex title={t('videoPlayer.scrollIntoViewOnPlay')}>
          <TooltipKeystrokeHint keys={['Ctrl', 'Enter']} />
        </TooltipComplex>
      }
    >
      <Button
        variant={TButtonVariant.SECONDARY}
        color={isOn ? ThemeColors.GREEN : offColor}
        icon={isOn ? TIcon.SHOW : TIcon.HIDE}
        onClick={() => settings.setScrollVideoIntoViewOnPlay(!isOn)}
      />
    </Tooltip>
  );
}

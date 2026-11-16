import { projects } from '@src/services/project';
import { useAppSelectors } from '@store/hooks';
import { FormsRow, FormsSection, FormsSectionContent, FormsSectionTitle } from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import TextInput from '@ui-toolkit/TextInput';
import Toggle from '@ui-toolkit/Toggle';
import Select from '@ui-toolkit/Select/Select';
import { TLanguage } from '@src/types';
import { useLanguageOptions } from '@utils/languageLabels';
import { applyTempoStandard } from '@utils/tempoTemplates';
import { TEMPO_STANDARD_CUSTOM } from '@bridge/definitions/projectEntry';
import Tooltip, { TooltipSimple } from '@ui-toolkit/Tooltip';
import { type PropsWithChildren, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

type TTempoField =
  | 'maxLinesPerEntry'
  | 'maxCharsPerLine'
  | 'maxCharsPerSecond'
  | 'minDurationMs'
  | 'minIntervalFrames';

// A limit's name, shown above its input while the input is hovered or focused: the inputs sit five
// to a row, too narrow for labels of their own
function LimitTooltip({ label, children }: PropsWithChildren<{ label: string }>) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  return (
    <Tooltip label={<TooltipSimple>{label}</TooltipSimple>} forceOpen={isHovered || isFocused}>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        {children}
      </div>
    </Tooltip>
  );
}

const LIMIT_FIELDS: readonly TTempoField[] = [
  'maxLinesPerEntry',
  'maxCharsPerLine',
  'maxCharsPerSecond',
  'minDurationMs',
  'minIntervalFrames',
];

const FIELD_ICONS: Record<TTempoField, TIcon> = {
  maxLinesPerEntry: TIcon.LINE_OUT,
  maxCharsPerLine: TIcon.LINE_SIZE,
  maxCharsPerSecond: TIcon.TEMPO,
  minDurationMs: TIcon.TIME_CONFIG,
  minIntervalFrames: TIcon.INTERVAL,
};

// The open project's subtitle limits (stored in its file): the toggle that switches the editor's
// per-line check on, and the limits themselves. The one implementation, mounted by the Settings
// overlay and by the editor aside's fly-out -- it must stay self-contained (no props).
export default function TempoSettings() {
  const { t } = useTranslation(['settings', 'errors']);
  const [tempo, isProjectOpen] = useAppSelectors(projects.selectTempo, projects.selectIsOpen);
  const languageOptions = useLanguageOptions();
  const {
    enabled,
    standard,
    maxLinesPerEntry,
    maxCharsPerLine,
    maxCharsPerSecond,
    minDurationMs,
    minIntervalFrames,
    highlightOverlaps,
  } = tempo;

  const {
    register,
    formState: { errors },
  } = useForm({
    values: {
      maxLinesPerEntry,
      maxCharsPerLine,
      maxCharsPerSecond,
      minDurationMs,
      minIntervalFrames,
    },
    mode: 'onChange',
  });

  // The picker shows the standard stored with the project; Custom is an option only while it's the
  // one stored (limits edited by hand)
  const isCustom = standard === TEMPO_STANDARD_CUSTOM;
  const standardOptions = useMemo(
    () =>
      isCustom
        ? [...languageOptions, { value: TEMPO_STANDARD_CUSTOM, label: t('tempo.custom') }]
        : languageOptions,
    [isCustom, languageOptions, t]
  );

  if (!isProjectOpen) return null;

  // Same contract as the Sync inputs: an invalid value shows its error and never reaches the store
  // (and so never the file); a valid whole number >= 1 is applied at once
  const registerLimit = (field: TTempoField) =>
    register(field, {
      required: t('errors:settings.tempoRequired'),
      min: { value: 1, message: t('errors:settings.tempoMin') },
      valueAsNumber: true,
      onChange: (e) => {
        const v = parseInt(e.currentTarget.value, 10);
        // A limit edited by hand no longer follows any language's standard
        if (Number.isInteger(v) && v >= 1) {
          projects.setTempo({ [field]: v, standard: TEMPO_STANDARD_CUSTOM });
        }
      },
    });

  return (
    <FormsRow animated>
      <FormsSection animated>
        <FormsSectionTitle
          icon={TIcon.TEMPO}
          after={
            <Toggle
              checked={enabled}
              onChange={(e) => projects.setTempo({ enabled: e.currentTarget.checked })}
            />
          }
        >
          {t('tempo.title')}
        </FormsSectionTitle>
        {enabled && (
          <>
            <FormsSectionContent>
              <Select
                placeholder={t('tempo.standard')}
                options={standardOptions}
                value={standard}
                onChange={([value]) => {
                  // Custom only names limits edited by hand: there's no standard to apply
                  if (!value || value === TEMPO_STANDARD_CUSTOM) return;
                  projects.setTempo(applyTempoStandard(value as TLanguage));
                }}
              />
            </FormsSectionContent>
            {/* All five in one row, unlabelled: each names itself in a tooltip (LimitTooltip) */}
            <FormsSectionContent $columns={LIMIT_FIELDS.length}>
              {LIMIT_FIELDS.map((field) => (
                <LimitTooltip key={field} label={t(`tempo.${field}Label`)}>
                  <TextInput
                    icon={FIELD_ICONS[field]}
                    aria-label={t(`tempo.${field}Label`)}
                    errors={errors[field] ? [errors[field].message] : []}
                    {...registerLimit(field)}
                  />
                </LimitTooltip>
              ))}
            </FormsSectionContent>
            <FormsSectionContent>
              <Toggle
                checked={highlightOverlaps}
                onChange={(e) => projects.setTempo({ highlightOverlaps: e.currentTarget.checked })}
              >
                {t('tempo.highlightOverlaps')}
              </Toggle>
            </FormsSectionContent>
          </>
        )}
      </FormsSection>
    </FormsRow>
  );
}

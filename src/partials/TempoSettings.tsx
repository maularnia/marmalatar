import { projects } from '@src/services/project';
import { useAppSelectors } from '@store/hooks';
import { FormsRow, FormsSection, FormsSectionContent, FormsSectionTitle } from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import TextInput from '@ui-toolkit/TextInput';
import Toggle from '@ui-toolkit/Toggle';
import Select from '@ui-toolkit/Select/Select';
import { TLanguage } from '@src/types';
import { useLanguageOptions } from '@utils/languageLabels';
import { findMatchingTempoLanguages, getTempoTemplate } from '@utils/tempoTemplates';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

type TTempoField =
  | 'maxLinesPerEntry'
  | 'maxCharsPerLine'
  | 'maxCharsPerSecond'
  | 'minDurationMs'
  | 'minIntervalFrames';

// The standard picker's entry for limits that match no language's standard
const CUSTOM_STANDARD = 'custom';

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
  minIntervalFrames: TIcon.STEP,
};

// The open project's subtitle limits (stored in its file): the toggle that switches the editor's
// per-line check on, and the limits themselves. The one implementation, mounted by the Settings
// overlay and by the editor aside's fly-out -- it must stay self-contained (no props).
export default function TempoSettings() {
  const { t } = useTranslation(['settings', 'errors']);
  const [tempo, isProjectOpen, targetLanguage] = useAppSelectors(
    projects.selectTempo,
    projects.selectIsOpen,
    projects.selectTargetLanguage
  );
  const languageOptions = useLanguageOptions();
  const {
    enabled,
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

  // The language whose standard the limits match: the project's output language when it's one of
  // them (several languages share a standard), else the first in the picker's order. Custom, an
  // option only while nothing matches, when none does.
  const { standard, standardOptions } = useMemo(() => {
    const matching = findMatchingTempoLanguages(tempo);
    const firstMatching = languageOptions.find((option) => matching.includes(option.value));
    const value =
      targetLanguage && matching.includes(targetLanguage)
        ? targetLanguage
        : (firstMatching?.value ?? CUSTOM_STANDARD);
    return {
      standard: value,
      standardOptions: matching.length
        ? languageOptions
        : [...languageOptions, { value: CUSTOM_STANDARD, label: t('tempo.custom') }],
    };
  }, [tempo, targetLanguage, languageOptions, t]);

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
        if (Number.isInteger(v) && v >= 1) projects.setTempo({ [field]: v });
      },
    });

  return (
    <FormsRow>
      <FormsSection>
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
                  // Custom only names limits that match no standard: there's nothing to apply
                  if (!value || value === CUSTOM_STANDARD) return;
                  projects.setTempo(getTempoTemplate(value as TLanguage));
                }}
              />
            </FormsSectionContent>
            {/* Two per row: the section also sits in the narrow editor aside */}
            <FormsSectionContent $columns={4}>
              {LIMIT_FIELDS.map((field) => (
                <TextInput
                  key={field}
                  icon={FIELD_ICONS[field]}
                  errors={errors[field] ? [errors[field].message] : []}
                  {...registerLimit(field)}
                >
                  {t(`tempo.${field}Label`)}
                </TextInput>
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

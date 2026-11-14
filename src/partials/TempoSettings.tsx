import { projects } from '@src/services/project';
import { useAppSelectors } from '@store/hooks';
import { FormsRow, FormsSection, FormsSectionContent, FormsSectionTitle } from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import TextInput from '@ui-toolkit/TextInput';
import Toggle from '@ui-toolkit/Toggle';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

type TTempoField = 'maxLinesPerEntry' | 'maxCharsPerSecond' | 'minDurationMs' | 'minIntervalFrames';

const LIMIT_FIELDS: readonly TTempoField[] = [
  'maxLinesPerEntry',
  'maxCharsPerSecond',
  'minDurationMs',
  'minIntervalFrames',
];

const FIELD_ICONS: Record<TTempoField, TIcon> = {
  maxLinesPerEntry: TIcon.LINE_OUT,
  maxCharsPerSecond: TIcon.TEMPO,
  minDurationMs: TIcon.TIME_CONFIG,
  minIntervalFrames: TIcon.STEP,
};

// The open project's subtitle limits (stored in its file): the toggle that switches the editor's
// per-line check on, and the limits themselves. The one implementation, mounted by the Settings
// overlay and by the editor aside's fly-out -- it must stay self-contained (no props).
export default function TempoSettings() {
  const { t } = useTranslation(['settings', 'errors']);
  const [tempo, isProjectOpen] = useAppSelectors(projects.selectTempo, projects.selectIsOpen);
  const {
    enabled,
    maxLinesPerEntry,
    maxCharsPerSecond,
    minDurationMs,
    minIntervalFrames,
    highlightOverlaps,
  } = tempo;

  const {
    register,
    formState: { errors },
  } = useForm({
    values: { maxLinesPerEntry, maxCharsPerSecond, minDurationMs, minIntervalFrames },
    mode: 'onChange',
  });

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

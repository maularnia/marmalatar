import { projects } from '@src/services/project';
import { useAppSelectors } from '@store/hooks';
import { FormsRow, FormsSection, FormsSectionContent, FormsSectionTitle } from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import TextInput from '@ui-toolkit/TextInput';
import Toggle from '@ui-toolkit/Toggle';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

type TTempoField = 'maxLinesPerEntry' | 'maxCharsPerLine' | 'minDurationMs';

const FIELD_ICONS: Record<TTempoField, TIcon> = {
  maxLinesPerEntry: TIcon.LINE_OUT,
  maxCharsPerLine: TIcon.SPACING,
  minDurationMs: TIcon.TIME_CONFIG,
};

// The open project's subtitle limits (stored in its file): the toggle that switches the editor's
// per-line check on, and the limits themselves. The one implementation, mounted by the Settings
// overlay and by the editor aside's fly-out -- it must stay self-contained (no props).
export default function TempoSettings() {
  const { t } = useTranslation(['settings', 'errors']);
  const [tempo, isProjectOpen] = useAppSelectors(projects.selectTempo, projects.selectIsOpen);
  const { enabled, maxLinesPerEntry, maxCharsPerLine, minDurationMs } = tempo;

  const {
    register,
    formState: { errors },
  } = useForm({
    values: { maxLinesPerEntry, maxCharsPerLine, minDurationMs },
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
          icon={TIcon.GAUGE}
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
          <FormsSectionContent $columns={3}>
            {(['maxLinesPerEntry', 'maxCharsPerLine', 'minDurationMs'] as const).map((field) => (
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
        )}
      </FormsSection>
    </FormsRow>
  );
}

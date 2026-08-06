import SubtitleFileSelect from '@src/segments/pages/Import/components/SubtitleFileSelect';
import { TLanguage, TSubtitleLine } from '@src/types';
import { useAutoFocusFirst } from '@src/utils/getFocusableElements';
import { useLanguageOptions } from '@src/utils/languageLabels';
import { toHumanShowTitle } from '@src/utils/toHumanShowTitle';
import Button from '@ui-toolkit/Button/Button';
import { TButtonVariant } from '@ui-toolkit/Button/types';
import {
  FormFooter,
  FormRoot,
  FormsContent,
  FormSectionEntry,
  FormsRow,
  FormsSection,
  FormsSectionContent,
  FormsSectionTitle,
} from '@ui-toolkit/forms';
import Hr, { THrVariant } from '@ui-toolkit/Hr/Hr';
import Icon from '@ui-toolkit/Icon/Icon';
import { TIcon, TIconSize } from '@ui-toolkit/Icon/icons';
import Select from '@ui-toolkit/Select/Select';
import TextInput from '@ui-toolkit/TextInput';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import VideoFileSelect from './components/VideoFileSelect';
import { useSubmitNewProject } from './hooks/useSubmitNewProject';

type TImportFormValues = {
  subtitlesFile: File | null;
  videoEnabled: boolean;
  videoFile: File | null;
  projectName: string;
  sourceLanguage: TLanguage;
  targetLanguage: TLanguage;
};

export default function PageImport() {
  const { t } = useTranslation(['errors', 'import']);
  const languageOptions = useLanguageOptions();
  const { submitNewProject } = useSubmitNewProject();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TImportFormValues>({
    defaultValues: {
      subtitlesFile: null,
      videoEnabled: false,
      videoFile: null,
      projectName: '',
      sourceLanguage: TLanguage.English,
      targetLanguage: TLanguage.Belarusian,
    },
  });

  const subtitlesFile = useWatch({ control, name: 'subtitlesFile' });
  const videoEnabled = useWatch({ control, name: 'videoEnabled' });
  const projectName = useWatch({ control, name: 'projectName' });

  const [cleanedLines, setCleanedLines] = useState<TSubtitleLine[]>([]);
  const [subtitleError, setSubtitleError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const isProjectNameDirty = useRef(false);
  const rootRef = useRef<HTMLFormElement>(null);
  useAutoFocusFirst(rootRef);

  useEffect(() => {
    if (!subtitlesFile) {
      isProjectNameDirty.current = false;
      return;
    }
    if (isProjectNameDirty.current) return;
    setValue('projectName', toHumanShowTitle(subtitlesFile.name), { shouldValidate: false });
  }, [subtitlesFile, setValue]);

  const onToggleVideoEnabled = useCallback(
    (enabled: boolean) => setValue('videoEnabled', enabled),
    [setValue]
  );

  const formValid = !subtitleError && (!videoEnabled || !videoError);

  const onSubmit = async (values: TImportFormValues) => {
    const trimmedProjectName = values.projectName.trim();
    if (!formValid || !cleanedLines.length || !trimmedProjectName) return;

    const baseLines = cleanedLines.map((line) => ({ ...line, output: '' }));
    await submitNewProject({
      lines: baseLines,
      projectName: trimmedProjectName,
      sourceLanguage: values.sourceLanguage,
      targetLanguage: values.targetLanguage,
    });
  };

  return (
    <FormRoot ref={rootRef} onSubmit={handleSubmit(onSubmit)} style={{ width: '580px' }}>
      <FormsContent>
        <FormsRow>
          <Controller
            control={control}
            name="subtitlesFile"
            render={({ field }) => (
              <SubtitleFileSelect
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                onError={setSubtitleError}
                onLinesChange={setCleanedLines}
              />
            )}
          />
        </FormsRow>
        <Hr variant={THrVariant.DIMMED} />
        <FormsRow>
          <Controller
            control={control}
            name="videoFile"
            render={({ field }) => (
              <VideoFileSelect
                name={field.name}
                enabled={videoEnabled}
                onToggleEnabled={onToggleVideoEnabled}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                onError={setVideoError}
              />
            )}
          />
        </FormsRow>
        {subtitlesFile && (
          <>
            <Hr variant={THrVariant.DIMMED} />
            <FormsRow>
              <FormsSection>
                <FormsSectionTitle icon={TIcon.LABEL}>
                  {t('import:projectTitle.sectionTitle')}
                </FormsSectionTitle>
                <FormsSectionContent>
                  <FormSectionEntry>
                    <Controller
                      control={control}
                      name="projectName"
                      rules={{
                        required: t('import.projectTitleRequired'),
                        pattern: {
                          value: /^[A-Za-z0-9 -]+$/,
                          message: t('import.projectTitlePattern'),
                        },
                      }}
                      render={({ field }) => (
                        <TextInput
                          {...field}
                          errors={
                            errors.projectName?.message ? [errors.projectName.message] : undefined
                          }
                          onChange={(e) => {
                            isProjectNameDirty.current = true;
                            field.onChange(e);
                          }}
                        />
                      )}
                    />
                  </FormSectionEntry>
                </FormsSectionContent>
              </FormsSection>
            </FormsRow>
          </>
        )}
        {subtitlesFile && (
          <>
            <Hr variant={THrVariant.DIMMED} />
            <FormsRow>
              <FormsSection>
                <FormsSectionTitle
                  icon={TIcon.LANGUAGE}
                  subtext={t('import:translationDirection.subtext')}
                >
                  {t('import:translationDirection.sectionTitle')}
                </FormsSectionTitle>
                <FormsSectionContent $columns={3} $templateColumns={'1fr min-content 1fr'}>
                  <Controller
                    control={control}
                    name="sourceLanguage"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onChange={([value]) => field.onChange(value as TLanguage)}
                        options={languageOptions}
                      />
                    )}
                  />
                  <Icon
                    style={{ alignSelf: 'center' }}
                    icon={TIcon.ARROW_RIGHT}
                    size={TIconSize.M}
                  />
                  <Controller
                    control={control}
                    name="targetLanguage"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onChange={([value]) => field.onChange(value as TLanguage)}
                        options={languageOptions}
                      />
                    )}
                  />
                </FormsSectionContent>
              </FormsSection>
            </FormsRow>
          </>
        )}
        <FormFooter>
          <Button
            type="submit"
            variant={TButtonVariant.SPECIAL}
            disabled={!formValid || isSubmitting || !cleanedLines.length || !projectName.trim()}
          >
            {t('import:startButton')}
          </Button>
        </FormFooter>
      </FormsContent>
    </FormRoot>
  );
}

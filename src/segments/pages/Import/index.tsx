import type { TProjectStatePrefs } from '@bridge/definitions/projectState';
import { projects } from '@src/services/project';
import SubtitleFileSelect from '@src/segments/pages/Import/components/SubtitleFileSelect';
import { TLanguage, TSubtitleLine } from '@src/types';
import { useAutoFocusFirst } from '@src/utils/getFocusableElements';
import { useLanguageOptions } from '@src/utils/languageLabels';
import { FALLBACK_EMOJI, pickRandomCreationEmoji } from '@src/utils/emoji';
import { toHumanShowTitle } from '@src/utils/toHumanShowTitle';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import Button from '@ui-toolkit/Button/Button';
import Emoji from '@ui-toolkit/Emoji';
import EmoPicker from '@ui-toolkit/EmoPicker';
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
  FormTitle,
} from '@ui-toolkit/forms';
import Hr, { THrVariant } from '@ui-toolkit/Hr/Hr';
import Icon from '@ui-toolkit/Icon/Icon';
import { TIcon, TIconSize } from '@ui-toolkit/Icon/icons';
import Select from '@ui-toolkit/Select/Select';
import TextInput from '@ui-toolkit/TextInput';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import P from '@src/toolkit/P';

const ProjectEmoji = styled(Emoji)`
  cursor: pointer;
  font-size: ${CSSVar('size18')};
  padding: ${CSSVar('size6')};
`;

type TImportFormValues = {
  subtitlesFile: File | null;
  projectName: string;
  emoji: string;
  editorMode: TProjectStatePrefs['editorMode'];
  sourceLanguage: TLanguage;
  // Ignored in edit mode: source and target are the same language there
  targetLanguage: TLanguage;
};

const ModeToggleText = styled(P)`
  white-space: nowrap;
  align-self: center;
`;

export default function PageImport() {
  const { t } = useTranslation(['errors', 'import']);
  const languageOptions = useLanguageOptions();

  const {
    control,
    handleSubmit,
    getFieldState,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TImportFormValues>({
    defaultValues: {
      subtitlesFile: null,
      projectName: '',
      emoji: FALLBACK_EMOJI,
      editorMode: 'translate',
      sourceLanguage: TLanguage.English,
      targetLanguage: TLanguage.Belarusian,
    },
  });

  const subtitlesFile = useWatch({ control, name: 'subtitlesFile' });
  const projectName = useWatch({ control, name: 'projectName' });
  const editorMode = useWatch({ control, name: 'editorMode' });

  const [cleanedLines, setCleanedLines] = useState<TSubtitleLine[]>([]);
  const [subtitleError, setSubtitleError] = useState<string | null>(null);

  const isProjectNameDirtyRef = useRef(false);
  const rootRef = useRef<HTMLFormElement>(null);
  useAutoFocusFirst(rootRef);

  useEffect(() => {
    if (!subtitlesFile) {
      isProjectNameDirtyRef.current = false;
      return;
    }
    if (isProjectNameDirtyRef.current) return;
    setValue('projectName', toHumanShowTitle(subtitlesFile.name), { shouldValidate: false });
  }, [subtitlesFile, setValue]);

  // A random emoji to start from. Loading the emoji database is async, so the fallback shows until
  // it's ready; a pick the user already made is kept.
  useEffect(() => {
    let isCancelled = false;
    pickRandomCreationEmoji()
      .then((emoji) => {
        if (!isCancelled && !getFieldState('emoji').isDirty) setValue('emoji', emoji);
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [getFieldState, setValue]);

  const formValid = !subtitleError;

  const onSubmit = async (values: TImportFormValues) => {
    const trimmedProjectName = values.projectName.trim();
    if (!formValid || !cleanedLines.length || !trimmedProjectName) return;

    const baseLines = cleanedLines.map((line) => ({ ...line, output: '' }));
    await projects.create({
      lines: baseLines,
      projectName: trimmedProjectName,
      emoji: values.emoji,
      editorMode: values.editorMode,
      sourceLanguage: values.sourceLanguage,
      targetLanguage: values.editorMode === 'edit' ? values.sourceLanguage : values.targetLanguage,
    });
  };

  return (
    <FormRoot ref={rootRef} onSubmit={handleSubmit(onSubmit)} style={{ width: '580px' }}>
      <FormTitle>{t('import:title')}</FormTitle>
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
        {subtitlesFile && (
          <>
            <Hr variant={THrVariant.DIMMED} />
            <FormsRow>
              <FormsSection>
                <FormsSectionTitle icon={TIcon.LOGO}>
                  {t('import:project.sectionTitle')}
                </FormsSectionTitle>
                <FormsSectionContent $columns={2} $templateColumns={'min-content 1fr'}>
                  <Controller
                    control={control}
                    name="emoji"
                    render={({ field }) => (
                      <EmoPicker
                        side="right"
                        onEmojiSelect={(emoji) => setValue('emoji', emoji, { shouldDirty: true })}
                      >
                        <ProjectEmoji>{field.value}</ProjectEmoji>
                      </EmoPicker>
                    )}
                  />
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
                            isProjectNameDirtyRef.current = true;
                            field.onChange(e);
                          }}
                        />
                      )}
                    />
                  </FormSectionEntry>
                </FormsSectionContent>
              </FormsSection>

              <FormsSection>
                <FormsSectionTitle
                  icon={TIcon.LANGUAGE}
                  subtext={t('import:languageAndMode.subtext')}
                >
                  {t('import:languageAndMode.sectionTitle')}
                </FormsSectionTitle>
                <FormsSectionContent
                  $columns={3}
                  $templateColumns="min-content min-content min-content auto"
                >
                  <Controller
                    control={control}
                    name="editorMode"
                    render={({ field }) => (
                      <>
                        <ModeToggleText>{t('import:languageAndMode.modePrefix')}</ModeToggleText>
                        {(['translate', 'edit'] as const).map((mode) => (
                          <Button
                            key={mode}
                            type="button"
                            icon={mode === 'translate' ? TIcon.TRANSLATE : TIcon.EDIT}
                            color={ThemeColors.ACCENT1}
                            variant={
                              field.value === mode
                                ? TButtonVariant.PRIMARY
                                : TButtonVariant.TRANSPARENT
                            }
                            aria-pressed={field.value === mode}
                            onClick={() => field.onChange(mode)}
                          >
                            {mode === 'translate'
                              ? t('import:languageAndMode.translateButton')
                              : t('import:languageAndMode.editButton')}
                          </Button>
                        ))}
                      </>
                    )}
                  />
                </FormsSectionContent>
                {editorMode === 'edit' ? (
                  <FormsSectionContent>
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
                  </FormsSectionContent>
                ) : (
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
                )}
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

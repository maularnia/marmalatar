import { CSSVar } from '@src/theme/utils';
import {
  FormRoot,
  FormsContent,
  FormSectionEntry,
  FormsRow,
  FormsSection,
  FormsSectionContent,
} from '@ui-toolkit/forms';
import Icon from '@ui-toolkit/Icon/Icon';
import { TIcon, TIconSize } from '@ui-toolkit/Icon/icons';
import Select from '@ui-toolkit/Select/Select';
import TextInput from '@ui-toolkit/TextInput';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { DialogBodyStandard, DialogContent, DialogTitle, DialogTitleContent } from '../partials';

type GlossaryPairFormFields = {
  original: string;
  translation: string;
};

type GlossaryOption = { value: string; label: string };

type GlossaryPairFormProps = {
  defaultOriginal?: string;
  defaultTranslation?: string;
  glossaryOptions?: GlossaryOption[];
  defaultGlossaryFileName?: string;
  onValidChange?: (isValid: boolean) => void;
  onFormReady?: (getValues: () => GlossaryPairFormFields) => void;
  onGlossaryChange?: (fileName: string) => void;
};

const ArrowContainer = styled.div`
  height: ${CSSVar('inputHeightRegular')};
  display: flex;
  align-items: center;
  justify-content: center;
`;

export default function GlossaryPairForm({
  defaultOriginal = '',
  defaultTranslation = '',
  glossaryOptions = [],
  defaultGlossaryFileName = '',
  onValidChange,
  onFormReady,
  onGlossaryChange,
}: GlossaryPairFormProps) {
  const { t } = useTranslation(['errors', 'dialogs']);
  const {
    register,
    formState: { errors, isValid },
    getValues,
  } = useForm<GlossaryPairFormFields>({
    defaultValues: { original: defaultOriginal, translation: defaultTranslation },
    mode: 'onChange',
  });

  const onValidChangeRef = useRef(onValidChange);
  onValidChangeRef.current = onValidChange;
  const onFormReadyRef = useRef(onFormReady);
  onFormReadyRef.current = onFormReady;

  useEffect(() => {
    onValidChangeRef.current?.(false);
  }, []);

  useEffect(() => {
    onValidChangeRef.current?.(isValid);
  }, [isValid]);

  useEffect(() => {
    onFormReadyRef.current?.(getValues);
  }, [getValues]);

  return (
    <DialogBodyStandard>
      <DialogTitle>
        <DialogTitleContent>{t('dialogs:addToGlossary.title')}</DialogTitleContent>
      </DialogTitle>
      <DialogContent>
        <FormRoot>
          <FormsContent>
            <FormsRow>
              <FormsSection>
                <FormsSectionContent>
                  <FormSectionEntry>
                    <Select
                      options={glossaryOptions}
                      value={defaultGlossaryFileName}
                      onChange={([v]) => onGlossaryChange?.(String(v ?? ''))}
                      placeholder={t('dialogs:addToGlossary.targetGlossaryPlaceholder')}
                    />
                  </FormSectionEntry>
                </FormsSectionContent>
                <FormsSectionContent $columns={3} $templateColumns="1fr min-content 1fr">
                  <FormSectionEntry>
                    <TextInput
                      icon={TIcon.INPUT}
                      {...register('original', {
                        required: t('glossaryPairForm.originalRequired'),
                      })}
                      errors={errors.original ? [errors.original.message] : []}
                    >
                      {t('dialogs:addToGlossary.originalLabel')}
                    </TextInput>
                  </FormSectionEntry>
                  <ArrowContainer>
                    <Icon size={TIconSize.L} icon={TIcon.ARROW_RIGHT} />
                  </ArrowContainer>

                  <FormSectionEntry>
                    <TextInput
                      icon={TIcon.OUTPUT}
                      {...register('translation', {
                        required: t('glossaryPairForm.translationRequired'),
                      })}
                      errors={errors.translation ? [errors.translation.message] : []}
                    >
                      {t('dialogs:addToGlossary.translationLabel')}
                    </TextInput>
                  </FormSectionEntry>
                </FormsSectionContent>
              </FormsSection>
            </FormsRow>
          </FormsContent>
        </FormRoot>
      </DialogContent>
    </DialogBodyStandard>
  );
}

export type { GlossaryPairFormFields, GlossaryPairFormProps };

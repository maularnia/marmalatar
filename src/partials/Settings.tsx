import {
  selectAskBeforeAITranslate,
  selectAskBeforeDelete,
  selectAskBeforeMerge,
  selectAskBeforeSplit,
  selectAutoMarkLinesCompleted,
  selectAutoMergeThreshold,
  selectCheckGrammar,
  selectScrollVideoIntoViewOnPlay,
  selectTimeAdjustmentStep,
  setAskBeforeAITranslate,
  setAskBeforeDelete,
  setAskBeforeMerge,
  setAskBeforeSplit,
  setAutoMarkLinesCompleted,
  setAutoMergeThreshold,
  setCheckGrammar,
  setScrollVideoIntoViewOnPlay,
  setTimeAdjustmentStep,
} from '@src/store/slices/app';
import { ThemeColors } from '@src/theme/utils';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { FormsRow, FormsSection, FormsSectionContent, FormsSectionTitle } from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import TextInput from '@ui-toolkit/TextInput';
import Toggle from '@ui-toolkit/Toggle';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

export default function Settings() {
  const { t } = useTranslation(['settings', 'errors']);
  const dispatch = useAppDispatch();
  const askBeforeMerge = useAppSelector(selectAskBeforeMerge);
  const askBeforeDelete = useAppSelector(selectAskBeforeDelete);
  const askBeforeAITranslate = useAppSelector(selectAskBeforeAITranslate);
  const askBeforeSplit = useAppSelector(selectAskBeforeSplit);
  const autoMergeThreshold = useAppSelector(selectAutoMergeThreshold);
  const timeAdjustmentStep = useAppSelector(selectTimeAdjustmentStep);
  const scrollVideoIntoViewOnPlay = useAppSelector(selectScrollVideoIntoViewOnPlay);
  const autoMarkLinesCompleted = useAppSelector(selectAutoMarkLinesCompleted);
  const checkGrammar = useAppSelector(selectCheckGrammar);

  const {
    register,
    formState: { errors },
  } = useForm({
    values: { autoMergeThreshold, timeAdjustmentStep },
    mode: 'onChange',
  });

  return (
    <>
      <FormsRow>
        <FormsSection>
          <FormsSectionTitle icon={TIcon.SYNC}>{t('sync.title')}</FormsSectionTitle>
          <FormsSectionContent $columns={2}>
            <TextInput
              icon={TIcon.SPACING}
              errors={errors.autoMergeThreshold ? [errors.autoMergeThreshold.message] : []}
              {...register('autoMergeThreshold', {
                required: t('errors:settings.autoMergeThresholdRequired'),
                min: { value: 1, message: t('errors:settings.autoMergeThresholdMin') },
                valueAsNumber: true,
                onChange: (e) => {
                  const v = parseInt(e.currentTarget.value, 10);
                  if (!isNaN(v) && v >= 1) dispatch(setAutoMergeThreshold(v));
                },
              })}
            >
              {t('sync.autoMergeThresholdLabel')}
            </TextInput>
            <TextInput
              icon={TIcon.STEP}
              errors={errors.timeAdjustmentStep ? [errors.timeAdjustmentStep.message] : []}
              {...register('timeAdjustmentStep', {
                required: t('errors:settings.timeAdjustmentStepRequired'),
                min: { value: 1, message: t('errors:settings.timeAdjustmentStepMin') },
                valueAsNumber: true,
                onChange: (e) => {
                  const v = parseInt(e.currentTarget.value, 10);
                  if (!isNaN(v) && v >= 1) dispatch(setTimeAdjustmentStep(v));
                },
              })}
            >
              {t('sync.timeAdjustmentStepLabel')}
            </TextInput>
          </FormsSectionContent>
        </FormsSection>
      </FormsRow>
      <FormsRow>
        <FormsSection>
          <FormsSectionTitle icon={TIcon.UX}>{t('uxUi.title')}</FormsSectionTitle>
          <FormsSectionContent>
            <Toggle
              checked={scrollVideoIntoViewOnPlay}
              onChange={(e) => dispatch(setScrollVideoIntoViewOnPlay(e.currentTarget.checked))}
            >
              {t('uxUi.scrollVideoIntoViewPrefix')}{' '}
              <Tag size={TTagSize.SMALL} variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT}>
                Ctrl
              </Tag>{' '}
              +{' '}
              <Tag size={TTagSize.SMALL} variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT}>
                Enter
              </Tag>{' '}
              {t('uxUi.scrollVideoIntoViewSuffix')}
            </Toggle>
          </FormsSectionContent>
          <FormsSectionContent $columns={2}>
            <Toggle
              checked={askBeforeMerge}
              onChange={(e) => dispatch(setAskBeforeMerge(e.currentTarget.checked))}
            >
              {t('uxUi.askBeforeMerge')}
            </Toggle>
            <Toggle
              checked={askBeforeDelete}
              onChange={(e) => dispatch(setAskBeforeDelete(e.currentTarget.checked))}
            >
              {t('uxUi.askBeforeDelete')}
            </Toggle>
            <Toggle
              checked={askBeforeAITranslate}
              onChange={(e) => dispatch(setAskBeforeAITranslate(e.currentTarget.checked))}
            >
              {t('uxUi.askBeforeAITranslate')}
            </Toggle>
            <Toggle
              checked={askBeforeSplit}
              onChange={(e) => dispatch(setAskBeforeSplit(e.currentTarget.checked))}
            >
              {t('uxUi.askBeforeSplit')}
            </Toggle>
          </FormsSectionContent>
          <FormsSectionContent>
            <Toggle
              checked={autoMarkLinesCompleted}
              onChange={(e) => dispatch(setAutoMarkLinesCompleted(e.currentTarget.checked))}
            >
              {t('uxUi.autoMarkLinesCompleted')}
            </Toggle>
          </FormsSectionContent>
          <FormsSectionContent>
            <Toggle
              checked={checkGrammar}
              onChange={(e) => dispatch(setCheckGrammar(e.currentTarget.checked))}
            >
              {t('uxUi.checkGrammar')}
            </Toggle>
          </FormsSectionContent>
        </FormsSection>
      </FormsRow>
    </>
  );
}

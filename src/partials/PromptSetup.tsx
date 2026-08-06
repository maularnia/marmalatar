import { useEffect, useMemo } from 'react';
import { shallowEqual } from 'react-redux';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import {
  selectSelectedPromptTemplateFileName,
  selectSelectedGlossaryFileNames,
  setSelectedGlossaryFileNames,
} from '@src/store/slices/prompt';
import {
  selectProjectSourceLanguage,
  selectProjectTargetLanguage,
} from '@src/store/slices/project';
import { selectAIintegrationEnabled, selectSelectedIntegrationId } from '@src/store/slices/app';
import {
  applySelectedPromptTemplateFileName,
  estimateContextWindowUsage,
  selectContextWindowEstimate,
  selectContextWindowEstimateStatus,
  selectIntegrationConnected,
  selectIntegrationPingError,
  selectTranslationIsBusy,
  setContextWindowEstimate,
  setContextWindowEstimateStatus,
} from '@store/slices/aiTranslation';
import { selectPromptTemplateItems, selectGlossaryItems } from '@store/slices/disc';
import { selectResolvedGlossaryEntries } from '@store/slices/aiPromptEditor';
import { refreshResolvedGlossaryEntries } from '@store/thunks';
import { aiClients } from '@src/services/ai/clients';
import type { AiClient } from '@src/services/ai/types';
import { ThemeColors } from '@src/theme/utils';
import {
  FormSectionEntry,
  FormsRow,
  FormsSection,
  FormsSectionContent,
  FormsSectionTitle,
} from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Message, { TMessageSize, TMessageVariant } from '@ui-toolkit/Message';
import ProgressBar from '@ui-toolkit/ProgressBar/ProgressBar';
import Select from '@ui-toolkit/Select/Select';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import { useTranslation } from 'react-i18next';

const ESTIMATE_DEBOUNCE_MS = 500;

export default function PromptSetupRow() {
  const { t } = useTranslation('settings');
  const dispatch = useAppDispatch();
  const promptTemplateItems = useAppSelector(selectPromptTemplateItems);
  const glossaryItems = useAppSelector(selectGlossaryItems);
  const isBusy = useAppSelector(selectTranslationIsBusy);
  const sourceLanguage = useAppSelector(selectProjectSourceLanguage);
  const targetLanguage = useAppSelector(selectProjectTargetLanguage);
  const selectedPromptTemplateFileName = useAppSelector(selectSelectedPromptTemplateFileName);
  const selectedGlossaryFileNames = useAppSelector(selectSelectedGlossaryFileNames, shallowEqual);
  const resolvedGlossaryEntries = useAppSelector(selectResolvedGlossaryEntries);
  const selectedIntegrationId = useAppSelector(selectSelectedIntegrationId);
  const aiTranslationEnabled = useAppSelector(selectAIintegrationEnabled);
  const connected = useAppSelector(selectIntegrationConnected);
  const pingError = useAppSelector(selectIntegrationPingError);
  const estimation = useAppSelector(selectContextWindowEstimate);
  const estimationStatus = useAppSelector(selectContextWindowEstimateStatus);

  const activeClient = selectedIntegrationId
    ? (aiClients as Record<string, AiClient>)[selectedIntegrationId]
    : undefined;
  const metricsSupported = Boolean(activeClient?.evaluateContext);

  // The integration is considered validly configured -- not just "some setting was typed in" --
  // once it's enabled and has successfully pinged. This is what the probe below reacts to,
  // never the raw settings-form field values themselves.
  const configured = aiTranslationEnabled && connected && !pingError;

  const promptTemplateOptions = useMemo(
    () => promptTemplateItems.map(({ fileName, title }) => ({ value: fileName, label: title })),
    [promptTemplateItems]
  );

  const filteredGlossaryOptions = useMemo(
    () =>
      glossaryItems
        .filter((g) => g.sourceLanguage === sourceLanguage && g.targetLanguage === targetLanguage)
        .map(({ fileName, title }) => ({ value: fileName, label: title })),
    [glossaryItems, sourceLanguage, targetLanguage]
  );

  // Re-resolve glossary entries whenever the selection changes and nothing's cached yet --
  // setSelectedGlossaryFileNames clears the cache, this repopulates it from disc.
  useEffect(() => {
    if (selectedGlossaryFileNames.length > 0 && resolvedGlossaryEntries.length === 0) {
      void dispatch(refreshResolvedGlossaryEntries());
    }
  }, [selectedGlossaryFileNames, resolvedGlossaryEntries.length, dispatch]);

  // Never re-runs while a valid estimate is already showing ('success') -- whatever it actually
  // depends on (prompt template, glossary selection, direction) is instead degraded back to
  // 'idle' at the exact point it changes (see the extraReducers matcher in aiTranslation.ts), so
  // simply mounting/re-rendering this component (e.g. opening Settings while the Editor aside's
  // own instance is already showing a valid estimate) never fires a redundant request. Otherwise
  // (disabled, misconfigured, or no template selected) the estimate is dropped and unavailable.
  useEffect(() => {
    if (!metricsSupported || !configured || !selectedPromptTemplateFileName) {
      dispatch(setContextWindowEstimateStatus('idle'));
      dispatch(setContextWindowEstimate(null));
      return;
    }

    if (estimationStatus === 'success') return;

    dispatch(setContextWindowEstimateStatus('estimating'));
    const timer = setTimeout(() => {
      void dispatch(estimateContextWindowUsage());
    }, ESTIMATE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [metricsSupported, configured, selectedPromptTemplateFileName, estimationStatus, dispatch]);

  const utilizationPercent =
    estimationStatus === 'success' && estimation && estimation.contextWindow > 0
      ? (estimation.tokenCount / estimation.contextWindow) * 100
      : null;

  const estimationValueAvailable =
    estimationStatus === 'success' && estimation && utilizationPercent !== null;

  const utilizationColor = !estimationValueAvailable
    ? ThemeColors.ACCENT2
    : utilizationPercent >= 80
      ? ThemeColors.RED
      : utilizationPercent <= 50
        ? ThemeColors.GREEN
        : ThemeColors.GOLD;

  return (
    <>
      <FormsRow>
        <FormsSection>
          <FormsSectionTitle icon={TIcon.PROMPT} subtext={t('aiSettings.prompt.subtext')}>
            {t('aiSettings.prompt.title')}
          </FormsSectionTitle>
          {activeClient && !activeClient.supportsContext ? (
            <FormsSectionContent>
              <FormSectionEntry>
                <Message
                  type={TMessageVariant.SECONDARY}
                  size={TMessageSize.M}
                  color={ThemeColors.ACCENT2}
                >
                  {t('aiSettings.prompt.unsupported', { name: activeClient.name })}
                </Message>
              </FormSectionEntry>
            </FormsSectionContent>
          ) : (
            <>
              <FormsSectionContent>
                <FormSectionEntry>
                  <Select
                    options={promptTemplateOptions}
                    value={selectedPromptTemplateFileName ?? ''}
                    onChange={([v]) =>
                      void dispatch(applySelectedPromptTemplateFileName((v as string) || null))
                    }
                    placeholder={t('aiSettings.prompt.promptTemplatePlaceholder')}
                    disabled={isBusy}
                  />
                </FormSectionEntry>
              </FormsSectionContent>
              <FormsSectionContent>
                <FormSectionEntry>
                  <Select
                    multiple
                    options={filteredGlossaryOptions}
                    value={selectedGlossaryFileNames}
                    onChange={(values) => dispatch(setSelectedGlossaryFileNames(values))}
                    placeholder={t('aiSettings.prompt.glossariesPlaceholder')}
                    disabled={isBusy}
                  />
                </FormSectionEntry>
              </FormsSectionContent>
            </>
          )}
        </FormsSection>
      </FormsRow>
      {metricsSupported && (
        <FormsRow>
          <FormsSection>
            <FormsSectionTitle icon={TIcon.GAUGE} subtext={t('aiSettings.contextWindow.subtext')}>
              {t('aiSettings.contextWindow.title')}{' '}
              <Tag size={TTagSize.SMALL} variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT}>
                {estimationValueAvailable
                  ? `${Math.round(utilizationPercent)}%`
                  : estimationStatus === 'estimating'
                    ? t('aiSettings.contextWindow.estimating')
                    : t('aiSettings.contextWindow.notAvailable')}
              </Tag>{' '}
              {estimationValueAvailable ? (
                <Tag size={TTagSize.SMALL} variant={TTagVariant.PRIMARY} color={utilizationColor}>
                  {estimation.tokenCount}/{estimation.contextWindow}
                </Tag>
              ) : null}
            </FormsSectionTitle>
            <FormsSectionContent>
              {!selectedPromptTemplateFileName && (
                <Message type={TMessageVariant.SECONDARY} color={ThemeColors.ORANGE}>
                  {t('aiSettings.contextWindow.noPromptTemplateSelected')}
                </Message>
              )}
              {selectedPromptTemplateFileName && (
                <ProgressBar
                  value={estimationValueAvailable ? estimation.tokenCount : 0}
                  total={estimationValueAvailable ? estimation.contextWindow : 0}
                  color={utilizationColor}
                />
              )}
            </FormsSectionContent>
          </FormsSection>
        </FormsRow>
      )}
    </>
  );
}

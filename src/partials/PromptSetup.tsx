import { aiClients } from '@src/services/ai/connector/clients';
import type { AiClient } from '@src/services/ai/connector/types';
import { settings } from '@src/store/slices/settings';
import { projects } from '@src/services/project';
import { promptTemplates } from '@src/services/prompt';
import { ThemeColors } from '@src/theme/utils';
import ProgressBar from '@src/toolkit/ProgressBar';
import { useAppSelectors } from '@store/hooks';
import { glossaries } from '@store/slices/glossary';
import { ai } from '@src/services/ai';
import {
  FormSectionEntry,
  FormsRow,
  FormsSection,
  FormsSectionContent,
  FormsSectionTitle,
} from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Message, { TMessageSize, TMessageVariant } from '@ui-toolkit/Message';
import Select from '@ui-toolkit/Select/Select';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const ESTIMATE_DEBOUNCE_MS = 500;

export default function PromptSetupRow() {
  const { t } = useTranslation('settings');
  const [
    promptTemplateItems,
    glossaryItems,
    isBusy,
    sourceLanguage,
    targetLanguage,
    selectedPromptTemplateFileName,
    resolvedGlossaryEntries,
    selectedIntegrationId,
    aiTranslationEnabled,
    connected,
    pingError,
    estimation,
    estimationStatus,
    selectedGlossaryFileNames,
  ] = useAppSelectors(
    promptTemplates.selectItems,
    glossaries.selectItems,
    ai.selectIsBusy,
    projects.selectSourceLanguage,
    projects.selectTargetLanguage,
    promptTemplates.selectSelectedFileName,
    glossaries.selectResolvedEntries,
    settings.selectSelectedIntegrationId,
    settings.selectAIintegrationEnabled,
    ai.selectIntegrationConnected,
    ai.selectIntegrationPingError,
    ai.selectContextWindowEstimate,
    ai.selectContextWindowEstimateStatus,
    glossaries.selectSelectedFileNames
  );

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
  // glossaries.setSelectedFileNames clears the cache, this repopulates it from disc.
  useEffect(() => {
    if (selectedGlossaryFileNames.length > 0 && resolvedGlossaryEntries.length === 0) {
      void glossaries.refreshResolvedEntries();
    }
  }, [selectedGlossaryFileNames, resolvedGlossaryEntries.length]);

  // Never re-runs while a valid estimate is already showing ('success') -- whatever it actually
  // depends on (prompt template, glossary selection, direction) is instead degraded back to
  // 'idle' at the exact point it changes (see the extraReducers matcher in ai.ts), so
  // simply mounting/re-rendering this component (e.g. opening Settings while the Editor aside's
  // own instance is already showing a valid estimate) never fires a redundant request. Otherwise
  // (disabled, misconfigured, or no template selected) the estimate is dropped and unavailable.
  useEffect(() => {
    if (!metricsSupported || !configured || !selectedPromptTemplateFileName) {
      ai.setContextWindowEstimateStatus('idle');
      ai.setContextWindowEstimate(null);
      return;
    }

    if (estimationStatus === 'success') return;

    ai.setContextWindowEstimateStatus('estimating');
    const timer = setTimeout(() => {
      void ai.estimateContextWindowUsage();
    }, ESTIMATE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [metricsSupported, configured, selectedPromptTemplateFileName, estimationStatus]);

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
                      void ai.applySelectedPromptTemplateFileName((v as string) || null)
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
                    onChange={(values) => glossaries.setSelectedFileNames(values)}
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

import { aiClients } from '@src/services/ai/clients';
import { DEFAULT_AI_CLIENT_ID } from '@src/services/ai/config';
import type { AiClient } from '@src/services/ai/types';
import {
  selectAIintegrationEnabled,
  selectSelectedIntegrationId,
  setAIintegrationEnabled,
} from '@src/store/slices/app';
import { selectIsProjectOpen } from '@src/store/slices/project';
import { ThemeColors } from '@src/theme/utils';
import Toggle from '@src/toolkit/Toggle';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { initializeAiIntegration, selectTranslationIsBusy } from '@store/slices/aiTranslation';
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
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AiUserInputSection from './PromptSetup';

export default function AiSettings() {
  const { t } = useTranslation('settings');
  const dispatch = useAppDispatch();
  const isBusy = useAppSelector(selectTranslationIsBusy);

  const selectedIntegrationId = useAppSelector(selectSelectedIntegrationId);
  const aiTranslationEnabled = useAppSelector(selectAIintegrationEnabled);
  const isProjectOpen = useAppSelector(selectIsProjectOpen);

  const activeId = selectedIntegrationId ?? DEFAULT_AI_CLIENT_ID;
  const activeClient = (aiClients as Record<string, AiClient>)[activeId];
  const SelectedForm = activeClient?.SettingsForm;

  const [settingsValid, setSettingsValid] = useState(false);

  const clientOptions = useMemo(
    () =>
      Object.keys(aiClients).map((id) => ({
        value: id,
        label: t('aiSettings.providers.useProvider', {
          name: aiClients[id as keyof typeof aiClients].name,
        }),
      })),
    [t]
  );

  const handleSwitchIntegration = (newId: string) => {
    setSettingsValid(false);
    void dispatch(initializeAiIntegration(newId));
  };

  return (
    <>
      {isBusy && (
        <FormsRow>
          <Message
            type={TMessageVariant.TERTIARY}
            size={TMessageSize.M}
            color={ThemeColors.ACCENT1}
          >
            {t('aiSettings.busyNotice')}
          </Message>
        </FormsRow>
      )}
      <FormsRow>
        <FormsSection>
          <FormsSectionTitle
            icon={TIcon.AI}
            after={
              <Toggle
                checked={aiTranslationEnabled}
                onChange={(e) => dispatch(setAIintegrationEnabled(e.currentTarget.checked))}
              />
            }
          >
            {t('aiSettings.enableToggle')}
          </FormsSectionTitle>
        </FormsSection>
      </FormsRow>
      {aiTranslationEnabled && (
        <>
          <FormsRow>
            <FormsSection>
              <FormsSectionTitle icon={TIcon.ROBOT} subtext={t('aiSettings.providers.subtext')}>
                {t('aiSettings.providers.title')}
              </FormsSectionTitle>
              <FormsSectionContent $columns={1}>
                <FormSectionEntry>
                  {clientOptions.length === 0 ? (
                    <Message
                      type={TMessageVariant.SECONDARY}
                      size={TMessageSize.XS}
                      color={ThemeColors.ORANGE}
                    >
                      {t('aiSettings.providers.noIntegrations')}
                    </Message>
                  ) : (
                    <Select
                      value={activeId}
                      onChange={(value) => handleSwitchIntegration(String(value))}
                      options={clientOptions}
                      disabled={isBusy}
                      placeholder={t('aiSettings.providers.placeholder')}
                    />
                  )}
                </FormSectionEntry>
              </FormsSectionContent>
              {SelectedForm && (
                <SelectedForm key={activeId} onSettingsValidChange={setSettingsValid} />
              )}
              {SelectedForm && !settingsValid && (
                <Message
                  type={TMessageVariant.TERTIARY}
                  size={TMessageSize.S}
                  color={ThemeColors.ACCENT2}
                >
                  {t('aiSettings.providers.finishConfiguring')}
                </Message>
              )}
            </FormsSection>
          </FormsRow>
          {isProjectOpen && <AiUserInputSection />}
        </>
      )}
    </>
  );
}

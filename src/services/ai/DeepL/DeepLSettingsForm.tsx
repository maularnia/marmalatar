import { useAppDispatch, useAppSelector } from '@store/hooks';
import {
  estimateContextWindowUsage,
  selectIntegrationConnected,
  selectIntegrationPingError,
  setIntegrationConnectionStatus,
} from '@store/slices/aiTranslation';
import { selectProjectTargetLanguage } from '@src/store/slices/project';
import i18n from '@src/i18n';
import { ThemeColors } from '@src/theme/utils';
import { getErrorMessage } from '@src/utils/errors';
import Button from '@ui-toolkit/Button/Button';
import { TButtonVariant } from '@ui-toolkit/Button/types';
import { FormSectionEntry, FormsSectionContent } from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Message, { TMessageSize, TMessageVariant } from '@ui-toolkit/Message';
import Select, { TOptionSelect } from '@ui-toolkit/Select/Select';
import TextInput from '@ui-toolkit/TextInput';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { AiClientSettingsFormProps, ConnectionStatus } from '@src/services/ai/types';
import { listDeepLGlossaries } from './translateWithDeepL';
import {
  DEEPL_FORMALITY_OPTIONS,
  DEEPL_LANGUAGES_WITHOUT_FORMALITY_SUPPORT,
  DEEPL_LANGUAGES_WITHOUT_GLOSSARY_SUPPORT,
  DEEPL_MODEL_TYPE_OPTIONS,
  DEEPL_NO_GLOSSARY_VALUE,
  DEFAULT_DEEPL_FORMALITY,
  DEFAULT_DEEPL_MODEL_TYPE,
} from './consts';
import {
  apiKeySettingKey,
  deeplClient,
  formalitySettingKey,
  glossaryIdSettingKey,
  linesPerRequestSettingKey,
  modelTypeSettingKey,
} from './deeplClient';
import type { DeepLSettingKey } from './deeplClient';
import {
  ConnectionStatusMessageKey,
  ConnectionStatusToColor,
  DEFAULT_LINES_PER_REQUEST,
  getLinesPerRequestOptions,
} from '@src/services/ai/config';
import { useLanguageLabels } from '@src/utils/languageLabels';

const t = i18n.getFixedT(null, 'errors');

function validateApiKey(value: string): string | undefined {
  if (!value.trim()) return t('deepL.apiKeyRequired');
  return undefined;
}

const SETTINGS_COMMIT_DEBOUNCE_MS = 500;
const RECONNECT_DEBOUNCE_MS = 500;

export default function DeepLSettingsForm({ onSettingsValidChange }: AiClientSettingsFormProps) {
  const { t: tSettings } = useTranslation('settings');
  const noGlossaryOption: TOptionSelect = useMemo(
    () => ({ value: DEEPL_NO_GLOSSARY_VALUE, label: tSettings('aiSettings.deepL.noGlossary') }),
    [tSettings]
  );
  const linesPerRequestOptions = useMemo(() => getLinesPerRequestOptions(tSettings), [tSettings]);
  const dispatch = useAppDispatch();
  const connected = useAppSelector(selectIntegrationConnected);
  const pingError = useAppSelector(selectIntegrationPingError);
  const targetLanguage = useAppSelector(selectProjectTargetLanguage);
  const languageLabels = useLanguageLabels();
  // Both glossary and formality support are DeepL properties of the target language only (not
  // the source/target pair as a whole) -- only check targetLanguage.
  const glossaryUnsupportedForActiveLanguage =
    targetLanguage !== null && DEEPL_LANGUAGES_WITHOUT_GLOSSARY_SUPPORT.includes(targetLanguage);
  const formalityUnsupportedForActiveLanguage =
    targetLanguage !== null && DEEPL_LANGUAGES_WITHOUT_FORMALITY_SUPPORT.includes(targetLanguage);
  const {
    register,
    control,
    reset,
    getValues,
    formState: { errors, isValid },
  } = useForm<Record<DeepLSettingKey, string>>({
    mode: 'onChange',
    defaultValues: {
      [apiKeySettingKey]: deeplClient.getCurrentSettings()?.[apiKeySettingKey] ?? '',
      [formalitySettingKey]: DEFAULT_DEEPL_FORMALITY,
      [modelTypeSettingKey]: DEFAULT_DEEPL_MODEL_TYPE,
      [linesPerRequestSettingKey]:
        deeplClient.getCurrentSettings()?.[linesPerRequestSettingKey] ?? DEFAULT_LINES_PER_REQUEST,
      [glossaryIdSettingKey]: DEEPL_NO_GLOSSARY_VALUE,
    },
  });

  const values = useWatch({ control });

  const [glossaryOptions, setGlossaryOptions] = useState<TOptionSelect[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [connectionError, setConnectionError] = useState<string | undefined>(undefined);
  const [encryptionAvailable, setEncryptionAvailable] = useState(true);

  const onSettingsValidChangeRef = useRef(onSettingsValidChange);
  onSettingsValidChangeRef.current = onSettingsValidChange;

  const commitDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // API key value the current `connected` status actually verified -- lets the reconnect-debounce
  // effect below tell "key genuinely changed" apart from "this effect just re-ran for some
  // unrelated reason", so a green status stays stale until the key really changes.
  const lastVerifiedApiKeyRef = useRef<string | null>(null);
  const connectionStatusRef = useRef<ConnectionStatus>(connectionStatus);
  connectionStatusRef.current = connectionStatus;

  const handleConnect = async () => {
    setConnectionStatus('connecting');
    setConnectionError(undefined);
    try {
      const apiKey = getValues(apiKeySettingKey);
      const connected = await deeplClient.ping();
      if (!connected) throw new Error(t('shared.connectFailed', { name: deeplClient.name }));
      const options = await listDeepLGlossaries(apiKey);
      setGlossaryOptions(options);
      deeplClient.setCachedOptions(options);
      lastVerifiedApiKeyRef.current = apiKey;
      setConnectionStatus('connected');
      dispatch(setIntegrationConnectionStatus({ connected: true }));
    } catch (err) {
      setConnectionStatus('error');
      setConnectionError(getErrorMessage(err));
      dispatch(setIntegrationConnectionStatus({ connected: false, error: getErrorMessage(err) }));
    }
  };

  useEffect(() => {
    void window.electronAPI.deeplEncryptionAvailable().then(setEncryptionAvailable);
  }, []);

  // Hydrate from whatever's already cached (e.g. set at boot) or, failing that, persisted storage.
  // If the integration is already known-good (Redux says connected, and a glossary list was
  // already fetched at some point this session), reuse that instead of re-pinging -- status stays
  // stale/green across remounts until the key changes, Refresh is clicked, or a real request
  // elsewhere degrades it back to disconnected.
  useEffect(() => {
    (async () => {
      const stored =
        deeplClient.getCurrentSettings() ?? (await deeplClient.loadPersistedSettings());
      if (!stored) return;
      reset(stored);
      const cachedOptions = deeplClient.getCachedOptions();
      if (connected && !pingError && cachedOptions !== null) {
        lastVerifiedApiKeyRef.current = stored[apiKeySettingKey];
        setGlossaryOptions(cachedOptions);
        setConnectionStatus('connected');
        return;
      }
      void handleConnect();
    })();
  }, []);

  useEffect(() => {
    onSettingsValidChangeRef.current(false);
  }, []);

  useEffect(() => {
    onSettingsValidChangeRef.current(isValid);
  }, [isValid]);

  // Commit valid settings to the client (cache + direct electron-bridge persistence), and
  // debounce a context-window re-estimate -- the app never sees these values, only that a
  // commit happened (via the client's own dispatch below).
  useEffect(() => {
    if (!isValid) return;
    deeplClient.setCurrentSettings(getValues());
    if (commitDebounceRef.current) clearTimeout(commitDebounceRef.current);
    commitDebounceRef.current = setTimeout(() => {
      void dispatch(estimateContextWindowUsage());
    }, SETTINGS_COMMIT_DEBOUNCE_MS);
  }, [
    isValid,
    values.api_key,
    values.formality,
    values.model_type,
    values.lines_per_request,
    values.glossary_id,
  ]);

  // Re-ping/re-list-glossaries after the user finishes editing the API key, decoupled from the
  // cheap settings-commit above. DeepL has no endpoint field, so the key itself drives this.
  // Skipped if already connected and the key hasn't actually changed since that connection was
  // verified -- this effect's dependency also fires once on initial mount, which the hydration
  // effect above already handled (live connect or stale reuse).
  useEffect(() => {
    if (reconnectDebounceRef.current) clearTimeout(reconnectDebounceRef.current);
    reconnectDebounceRef.current = setTimeout(() => {
      const apiKey = values.api_key ?? '';
      if (validateApiKey(apiKey)) return;
      if (connectionStatusRef.current === 'connected' && lastVerifiedApiKeyRef.current === apiKey) {
        return;
      }
      void handleConnect();
    }, RECONNECT_DEBOUNCE_MS);
    return () => {
      if (reconnectDebounceRef.current) clearTimeout(reconnectDebounceRef.current);
    };
  }, [values.api_key]);

  return (
    <>
      <FormsSectionContent>
        {!encryptionAvailable && (
          <FormSectionEntry>
            <Message
              type={TMessageVariant.SECONDARY}
              size={TMessageSize.XS}
              color={ThemeColors.ORANGE}
            >
              {tSettings('aiSettings.deepL.keychainWarning')}
            </Message>
          </FormSectionEntry>
        )}
        {glossaryUnsupportedForActiveLanguage && targetLanguage !== null && (
          <FormSectionEntry>
            <Message
              type={TMessageVariant.SECONDARY}
              size={TMessageSize.XS}
              color={ThemeColors.RED}
            >
              {tSettings('aiSettings.deepL.glossaryUnsupported', {
                language: languageLabels[targetLanguage],
              })}
            </Message>
          </FormSectionEntry>
        )}
        {formalityUnsupportedForActiveLanguage && targetLanguage !== null && (
          <FormSectionEntry>
            <Message
              type={TMessageVariant.SECONDARY}
              size={TMessageSize.XS}
              color={ThemeColors.RED}
            >
              {tSettings('aiSettings.deepL.formalityUnsupported', {
                language: languageLabels[targetLanguage],
              })}
            </Message>
          </FormSectionEntry>
        )}
        <FormSectionEntry>
          <Message
            type={TMessageVariant.SECONDARY}
            size={TMessageSize.XS}
            color={ThemeColors.ACCENT1}
          >
            {tSettings('aiSettings.deepL.glossaryInfo')}
          </Message>
        </FormSectionEntry>
      </FormsSectionContent>
      <FormsSectionContent $columns={3} $templateColumns="1fr min-content auto">
        <FormSectionEntry>
          <TextInput
            type="password"
            {...register(apiKeySettingKey, { validate: validateApiKey })}
            errors={errors.api_key ? [errors.api_key.message] : []}
          >
            {tSettings('aiSettings.deepL.apiKey')}
          </TextInput>
        </FormSectionEntry>
        <FormSectionEntry>
          <Button
            style={{ alignSelf: 'flex-start' }}
            icon={TIcon.REFRESH}
            variant={TButtonVariant.TRANSPARENT}
            color={ThemeColors.TEXT}
            onClick={() => void handleConnect()}
            disabled={connectionStatus === 'connecting'}
          />
        </FormSectionEntry>
        <FormSectionEntry>
          <Message
            size={TMessageSize.S}
            type={TMessageVariant.SECONDARY}
            color={ConnectionStatusToColor[connectionStatus]}
          >
            {tSettings(ConnectionStatusMessageKey[connectionStatus])}
          </Message>
        </FormSectionEntry>
      </FormsSectionContent>
      {connectionStatus === 'error' && connectionError && (
        <FormsSectionContent>
          <FormSectionEntry>
            <Message
              type={TMessageVariant.SECONDARY}
              size={TMessageSize.XS}
              color={ThemeColors.RED}
            >
              {connectionError}
            </Message>
          </FormSectionEntry>
        </FormsSectionContent>
      )}
      <FormsSectionContent $columns={2}>
        <FormSectionEntry>
          <Controller
            name={formalitySettingKey}
            control={control}
            rules={{ required: t('shared.selectValueRequired') }}
            render={({ field, fieldState }) => (
              <Select
                value={field.value ?? DEFAULT_DEEPL_FORMALITY}
                onChange={([v]) => field.onChange(String(v ?? ''))}
                options={DEEPL_FORMALITY_OPTIONS}
                placeholder={tSettings('aiSettings.deepL.formality')}
                disabled={connectionStatus !== 'connected' || formalityUnsupportedForActiveLanguage}
                errors={[fieldState.error?.message].filter(Boolean)}
              />
            )}
          />
        </FormSectionEntry>
        <FormSectionEntry>
          <Controller
            name={modelTypeSettingKey}
            control={control}
            rules={{ required: t('shared.selectValueRequired') }}
            render={({ field, fieldState }) => (
              <Select
                value={field.value ?? DEFAULT_DEEPL_MODEL_TYPE}
                onChange={([v]) => field.onChange(String(v ?? ''))}
                options={DEEPL_MODEL_TYPE_OPTIONS}
                placeholder={tSettings('aiSettings.deepL.modelType')}
                disabled={connectionStatus !== 'connected'}
                errors={[fieldState.error?.message].filter(Boolean)}
              />
            )}
          />
        </FormSectionEntry>
        <FormSectionEntry>
          <Controller
            name={linesPerRequestSettingKey}
            control={control}
            rules={{ required: t('shared.selectValueRequired') }}
            render={({ field, fieldState }) => (
              <Select
                value={field.value ?? DEFAULT_LINES_PER_REQUEST}
                onChange={([v]) => field.onChange(String(v ?? ''))}
                options={linesPerRequestOptions}
                placeholder={tSettings('aiSettings.common.linesPerRequest')}
                errors={[fieldState.error?.message].filter(Boolean)}
              />
            )}
          />
        </FormSectionEntry>
        <FormSectionEntry>
          <Controller
            name={glossaryIdSettingKey}
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? DEEPL_NO_GLOSSARY_VALUE}
                onChange={([v]) => field.onChange(String(v ?? ''))}
                options={[noGlossaryOption, ...glossaryOptions]}
                placeholder={tSettings('aiSettings.deepL.glossary')}
                disabled={connectionStatus !== 'connected' || glossaryUnsupportedForActiveLanguage}
              />
            )}
          />
        </FormSectionEntry>
      </FormsSectionContent>
    </>
  );
}

import { useAppSelectors } from '@store/hooks';
import { ai } from '@src/services/ai';
import { aiClients } from '@src/services/ai/connector/clients';
import i18n from '@src/i18n';
import { ThemeColors } from '@src/theme/utils';
import { getErrorMessage } from '@src/utils/errors';
import Button from '@ui-toolkit/Button/Button';
import { TButtonVariant } from '@ui-toolkit/Button/types';
import { FormSectionEntry, FormsSectionContent } from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Message, { TMessageSize, TMessageVariant } from '@ui-toolkit/Message';
import Select from '@ui-toolkit/Select/Select';
import type { TOptionSelect } from '@ui-toolkit/Select/types';
import TextInput from '@ui-toolkit/TextInput';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { AiClientSettingsFormProps, ConnectionStatus } from '@src/services/ai/connector/types';
import { listLMStudioModels } from './translateWithLMStudio';
import {
  contextLengthSettingKey,
  DEFAULT_LMSTUDIO_CONTEXT_LENGTH,
  DEFAULT_LMSTUDIO_HOST,
  DEFAULT_LMSTUDIO_REASONING_END_TAG,
  DEFAULT_LMSTUDIO_REASONING_START_TAG,
  endpointSettingKey,
  linesPerRequestSettingKey,
  LMSTUDIO_CLIENT_ID,
  LMSTUDIO_CONTEXT_LENGTH_OPTIONS,
  modelSettingKey,
  reasoningEndTagSettingKey,
  reasoningStartTagSettingKey,
  type LMStudioSettingKey,
} from './consts';
import {
  ConnectionStatusMessageKey,
  ConnectionStatusToColor,
  DEFAULT_LINES_PER_REQUEST,
  getLinesPerRequestOptions,
} from '@src/services/ai/connector/config';

const t = i18n.getFixedT(null, 'errors');

function validateEndpoint(value: string): string | undefined {
  if (!value.trim()) return t('shared.serverAddressRequired');
  try {
    new URL(value.trim());
    return undefined;
  } catch {
    return t('shared.invalidUrl');
  }
}

const SETTINGS_COMMIT_DEBOUNCE_MS = 500;
const RECONNECT_DEBOUNCE_MS = 500;

// From the clients registry: the client doesn't import its form, so there's no cycle
const client = aiClients[LMSTUDIO_CLIENT_ID];

export default function LMStudioSettingsForm({ onSettingsValidChange }: AiClientSettingsFormProps) {
  const { t: tSettings } = useTranslation('settings');
  const linesPerRequestOptions = useMemo(() => getLinesPerRequestOptions(tSettings), [tSettings]);
  const [connected, pingError] = useAppSelectors(
    ai.selectIntegrationConnected,
    ai.selectIntegrationPingError
  );
  const {
    register,
    control,
    reset,
    getValues,
    setValue,
    formState: { errors, isValid },
  } = useForm<Record<LMStudioSettingKey, string>>({
    mode: 'onChange',
    defaultValues: {
      [endpointSettingKey]:
        client.getCurrentSettings()?.[endpointSettingKey] ?? DEFAULT_LMSTUDIO_HOST,
      [modelSettingKey]: '',
      [contextLengthSettingKey]: DEFAULT_LMSTUDIO_CONTEXT_LENGTH,
      [reasoningStartTagSettingKey]: DEFAULT_LMSTUDIO_REASONING_START_TAG,
      [reasoningEndTagSettingKey]: DEFAULT_LMSTUDIO_REASONING_END_TAG,
      [linesPerRequestSettingKey]:
        client.getCurrentSettings()?.[linesPerRequestSettingKey] ?? DEFAULT_LINES_PER_REQUEST,
    },
  });

  const values = useWatch({ control });

  const [modelOptions, setModelOptions] = useState<TOptionSelect[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [connectionError, setConnectionError] = useState<string | undefined>(undefined);

  const onSettingsValidChangeRef = useRef(onSettingsValidChange);
  onSettingsValidChangeRef.current = onSettingsValidChange;

  const commitDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Endpoint value the current `connected` status actually verified -- lets the reconnect-debounce
  // effect below tell "endpoint genuinely changed" apart from "this effect just re-ran for some
  // unrelated reason", so a green status stays stale until the endpoint really changes.
  const lastVerifiedEndpointRef = useRef<string | null>(null);
  const connectionStatusRef = useRef<ConnectionStatus>(connectionStatus);
  connectionStatusRef.current = connectionStatus;

  const handleConnect = useCallback(async () => {
    setConnectionStatus('connecting');
    setConnectionError(undefined);
    try {
      const connected = await client.ping();
      if (!connected) throw new Error(t('shared.connectFailed', { name: client.name }));
      const options = await listLMStudioModels({ host: getValues(endpointSettingKey) });
      setModelOptions(options);
      client.setCachedOptions(options);
      lastVerifiedEndpointRef.current = getValues(endpointSettingKey);
      if (!options.some((option) => option.value === getValues(modelSettingKey))) {
        setValue(modelSettingKey, options[0]?.value ?? '', { shouldValidate: true });
      }
      setConnectionStatus('connected');
      ai.setIntegrationConnectionStatus({ connected: true });
    } catch (err) {
      setConnectionStatus('error');
      setConnectionError(getErrorMessage(err));
      ai.setIntegrationConnectionStatus({
        connected: false,
        error: getErrorMessage(err),
      });
    }
  }, [getValues, setValue]);

  // Hydrate from whatever's already cached (e.g. set at boot) or, failing that, persisted storage.
  // If the integration is already known-good (Redux says connected, and a model list was already
  // fetched at some point this session), reuse that instead of re-pinging -- status stays
  // stale/green across remounts until the endpoint changes, Refresh is clicked, or a real request
  // elsewhere degrades it back to disconnected.
  useEffect(() => {
    (async () => {
      const stored = client.getCurrentSettings() ?? (await client.loadPersistedSettings());
      if (!stored) return;
      reset(stored);
      const cachedOptions = client.getCachedOptions();
      if (connected && !pingError && cachedOptions !== null) {
        lastVerifiedEndpointRef.current = stored[endpointSettingKey];
        setModelOptions(cachedOptions);
        setConnectionStatus('connected');
        return;
      }
      handleConnect();
    })();
  }, [connected, handleConnect, pingError, reset]);

  useEffect(() => {
    onSettingsValidChangeRef.current(false);
  }, []);

  useEffect(() => {
    onSettingsValidChangeRef.current(isValid);
  }, [isValid]);

  // Commits as soon as the endpoint alone is valid -- not gated on the whole form (`isValid`),
  // since that would deadlock: `model` is required for `isValid`, but the model dropdown can only
  // be populated by a successful ping(), which itself requires settings to already be committed
  // (see AiClient.requireCurrentSettings). Committing on endpoint-validity alone breaks the cycle;
  // the context-window re-estimate below still waits for full validity, since it needs a real model.
  useEffect(() => {
    if (validateEndpoint(values.endpoint ?? '')) return;
    client.setCurrentSettings(getValues());
    if (!isValid) return;
    if (commitDebounceRef.current) clearTimeout(commitDebounceRef.current);
    commitDebounceRef.current = setTimeout(() => {
      void ai.estimateContextWindowUsage();
    }, SETTINGS_COMMIT_DEBOUNCE_MS);
  }, [
    isValid,
    values.endpoint,
    values.model,
    values.context_length,
    values.reasoning_start_tag,
    values.reasoning_end_tag,
    values.lines_per_request,
    getValues,
  ]);

  // Re-ping/re-list-models after the user finishes editing the endpoint. Skipped if already
  // connected and the endpoint hasn't actually changed since that connection was verified -- this
  // effect's dependency also fires once on initial mount, which the hydration effect above already
  // handled (live connect or stale reuse).
  useEffect(() => {
    if (reconnectDebounceRef.current) clearTimeout(reconnectDebounceRef.current);
    reconnectDebounceRef.current = setTimeout(() => {
      const endpoint = values.endpoint ?? '';
      if (validateEndpoint(endpoint)) return;
      if (
        connectionStatusRef.current === 'connected' &&
        lastVerifiedEndpointRef.current === endpoint
      ) {
        return;
      }
      void handleConnect();
    }, RECONNECT_DEBOUNCE_MS);
    return () => {
      if (reconnectDebounceRef.current) clearTimeout(reconnectDebounceRef.current);
    };
  }, [values.endpoint, handleConnect]);

  return (
    <>
      <FormsSectionContent $columns={3} $templateColumns="1fr min-content auto">
        <FormSectionEntry>
          <TextInput
            {...register(endpointSettingKey, { validate: validateEndpoint })}
            errors={errors.endpoint ? [errors.endpoint.message] : []}
          >
            {tSettings('aiSettings.lmStudio.endpointAddress')}
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
            name={modelSettingKey}
            control={control}
            rules={{ required: t('shared.selectValueRequired') }}
            render={({ field, fieldState }) => (
              <Select
                value={field.value ?? ''}
                onChange={([v]) => field.onChange(String(v ?? ''))}
                options={
                  modelOptions.length
                    ? modelOptions
                    : [{ label: tSettings('aiSettings.common.nothingToSelect'), value: '' }]
                }
                placeholder={tSettings('aiSettings.common.model')}
                disabled={connectionStatus !== 'connected'}
                errors={[fieldState.error?.message].filter(Boolean)}
              />
            )}
          />
        </FormSectionEntry>
        <FormSectionEntry>
          <Controller
            name={contextLengthSettingKey}
            control={control}
            rules={{ required: t('shared.selectValueRequired') }}
            render={({ field, fieldState }) => (
              <Select
                value={field.value ?? DEFAULT_LMSTUDIO_CONTEXT_LENGTH}
                onChange={([v]) => field.onChange(String(v ?? ''))}
                options={LMSTUDIO_CONTEXT_LENGTH_OPTIONS}
                placeholder={tSettings('aiSettings.common.contextLength')}
                disabled={connectionStatus !== 'connected'}
                errors={[fieldState.error?.message].filter(Boolean)}
              />
            )}
          />
        </FormSectionEntry>
        <FormSectionEntry>
          <TextInput
            {...register(reasoningStartTagSettingKey)}
            disabled={connectionStatus !== 'connected'}
          >
            {tSettings('aiSettings.lmStudio.reasoningStartTag')}
          </TextInput>
        </FormSectionEntry>
        <FormSectionEntry>
          <TextInput
            {...register(reasoningEndTagSettingKey)}
            disabled={connectionStatus !== 'connected'}
          >
            {tSettings('aiSettings.lmStudio.reasoningEndTag')}
          </TextInput>
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
      </FormsSectionContent>
    </>
  );
}

import { AiClient, TranslationRequestContext } from '@src/services/ai/types';
import i18n from '@src/i18n';
import { resolveBatchSize } from '@src/services/ai/batchingUtils';
import { pingDeepL, translateBatchWithDeepL, translateWithDeepL } from './translateWithDeepL';
import {
  DEEPL_LANGUAGES_WITHOUT_FORMALITY_SUPPORT,
  DEEPL_LANGUAGES_WITHOUT_GLOSSARY_SUPPORT,
  DEFAULT_DEEPL_FORMALITY,
  DEFAULT_DEEPL_MODEL_TYPE,
  resolveDeepLSourceLanguageCode,
  resolveDeepLTargetLanguageCode,
} from './consts';
import DeepLSettingsForm from './DeepLSettingsForm';

export type DeepLSettingKey =
  | 'api_key'
  | 'formality'
  | 'model_type'
  | 'lines_per_request'
  | 'glossary_id';

export const apiKeySettingKey: DeepLSettingKey = 'api_key';
export const formalitySettingKey: DeepLSettingKey = 'formality';
export const modelTypeSettingKey: DeepLSettingKey = 'model_type';
export const linesPerRequestSettingKey: DeepLSettingKey = 'lines_per_request';
export const glossaryIdSettingKey: DeepLSettingKey = 'glossary_id';

const t = i18n.getFixedT(null, 'errors');

function requireLanguages(context?: TranslationRequestContext): {
  sourceLang: string;
  targetLang: string;
} {
  if (context?.sourceLanguageCode === undefined || context?.targetLanguageCode === undefined) {
    throw new Error(t('deepL.languagesRequired'));
  }
  return {
    sourceLang: resolveDeepLSourceLanguageCode(context.sourceLanguageCode),
    targetLang: resolveDeepLTargetLanguageCode(context.targetLanguageCode),
  };
}

// Never sends a glossary_id for a target language DeepL doesn't support glossaries for (e.g.
// Belarusian) -- proactive, rather than relying on the translate-time mismatch fallback in
// electron/deepl.ts (which stays in place as a defense-in-depth safety net for other cases, like a
// glossary deleted externally on DeepL's dashboard). Checked against target language only, same
// as formality below -- both are DeepL properties of the target language, not the language pair.
function resolveGlossaryId(
  settings: Record<DeepLSettingKey, string>,
  context?: TranslationRequestContext
): string | undefined {
  const glossaryId = settings[glossaryIdSettingKey] || undefined;
  if (!glossaryId) return undefined;
  const { targetLanguageCode } = context ?? {};
  if (
    targetLanguageCode !== undefined &&
    DEEPL_LANGUAGES_WITHOUT_GLOSSARY_SUPPORT.includes(targetLanguageCode)
  ) {
    return undefined;
  }
  return glossaryId;
}

// Never sends `formality` for a target language DeepL doesn't support it for (e.g. English,
// Belarusian, Ukrainian) -- DeepL rejects the whole request with a 400 ("Target language 'be'
// doesn't support formality") rather than silently ignoring an inapplicable value, so this must
// be proactive, not just a retry-on-failure fallback like the glossary case.
function resolveFormality(
  settings: Record<DeepLSettingKey, string>,
  context?: TranslationRequestContext
): string | undefined {
  const { targetLanguageCode } = context ?? {};
  if (
    targetLanguageCode !== undefined &&
    DEEPL_LANGUAGES_WITHOUT_FORMALITY_SUPPORT.includes(targetLanguageCode)
  ) {
    return undefined;
  }
  return settings[formalitySettingKey] || DEFAULT_DEEPL_FORMALITY;
}

class DeepLClient extends AiClient<DeepLSettingKey> {
  readonly id = 'deepl';
  readonly name = 'DeepL';
  readonly supportsContext = false;
  readonly SettingsForm = DeepLSettingsForm;

  // Splits persistence: the API key goes through the dedicated safeStorage-backed channel,
  // everything else through the generic per-integration settings channel used by every other
  // client. The in-memory cache still holds the full merged object either way.
  override setCurrentSettings(settings: Record<DeepLSettingKey, string>): void {
    this.currentSettings = settings;
    const { [apiKeySettingKey]: apiKey, ...rest } = settings;
    void window.electronAPI.setDeepLApiKey(apiKey ?? '');
    void window.electronAPI.setIntegrationSettings(this.id, rest);
  }

  override async loadPersistedSettings(): Promise<Record<DeepLSettingKey, string> | null> {
    const [apiKey, rest] = await Promise.all([
      window.electronAPI.getDeepLApiKey(),
      window.electronAPI.getIntegrationSettings(this.id) as Promise<Record<
        DeepLSettingKey,
        string
      > | null>,
    ]);
    if (!apiKey && !rest) return this.currentSettings;
    const merged = { ...(rest ?? {}), [apiKeySettingKey]: apiKey ?? '' } as Record<
      DeepLSettingKey,
      string
    >;
    this.currentSettings = merged;
    return merged;
  }

  async ping(): Promise<boolean> {
    return this.guardBackendCall(async () => {
      const settings = this.requireCurrentSettings();
      return pingDeepL(settings[apiKeySettingKey]);
    });
  }

  async translate({
    text,
    context,
  }: {
    text: string;
    context?: TranslationRequestContext;
  }): Promise<string> {
    return this.guardBackendCall(async () => {
      const settings = this.requireCurrentSettings();
      const { sourceLang, targetLang } = requireLanguages(context);
      const lineNo = context?.lineNo ?? 0;
      const results = await translateWithDeepL({
        apiKey: settings[apiKeySettingKey],
        sourceLang,
        targetLang,
        lines: [{ line: lineNo, text }],
        formality: resolveFormality(settings, context),
        modelType: settings[modelTypeSettingKey] || DEFAULT_DEEPL_MODEL_TYPE,
        glossaryId: resolveGlossaryId(settings, context),
      });
      const match = results.find((result) => result.line === lineNo);
      if (!match) {
        throw new Error(t('deepL.noTranslationReturned'));
      }
      return match.text;
    });
  }

  bulkTranslate({
    lines,
    context,
    onDone,
    onChunkError,
    onChunkStart,
    onChunkTranslated,
    onProgress,
  }: Parameters<AiClient<DeepLSettingKey>['bulkTranslate']>[0]) {
    const settings = this.requireCurrentSettings();
    const { sourceLang, targetLang } = requireLanguages(context);
    return translateBatchWithDeepL({
      apiKey: settings[apiKeySettingKey],
      sourceLang,
      targetLang,
      lines,
      formality: resolveFormality(settings, context),
      modelType: settings[modelTypeSettingKey] || DEFAULT_DEEPL_MODEL_TYPE,
      glossaryId: resolveGlossaryId(settings, context),
      chunkSize: resolveBatchSize(settings[linesPerRequestSettingKey], lines.length),
      onDone,
      onChunkError: (payload) => {
        this.cachedOptions = null;
        onChunkError?.(payload);
      },
      onChunkStart,
      onChunkTranslated,
      onProgress,
    });
  }

  // No evaluateContext -- DeepL has no token-window concept. PromptSetupRow's utilization
  // section is gated on this being absent (see PromptSetup.tsx/AiTranslationStatusPanel.tsx).
}

export const deeplClient = new DeepLClient();

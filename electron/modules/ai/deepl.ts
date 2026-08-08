import { safeStorage } from 'electron';
import type Store from 'electron-store';
import * as deepl from 'deepl-node';
import type {
  DeepLGlossaryOption,
  DeepLTranslationParams,
  DeepLTranslationResult,
} from '../../../bridge/definitions/deepl';

const cachedClients = new Map<string, deepl.DeepLClient>();

function getSdkClient(apiKey: string): deepl.DeepLClient {
  let client = cachedClients.get(apiKey);
  if (!client) {
    client = new deepl.DeepLClient(apiKey);
    cachedClients.set(apiKey, client);
  }
  return client;
}

export async function pingDeepL(apiKey: string): Promise<boolean> {
  try {
    await getSdkClient(apiKey).getUsage();
    return true;
  } catch {
    return false;
  }
}

export async function listDeepLGlossaries(apiKey: string): Promise<DeepLGlossaryOption[]> {
  const glossaries = await getSdkClient(apiKey).listMultilingualGlossaries();
  return glossaries.map((glossary) => ({ value: glossary.glossaryId, label: glossary.name }));
}

// sourceLang/targetLang/formality/modelType arrive as plain strings over the bridge (see
// bridge/deepl.ts) -- cast to the deepl-node SDK's literal union types here, at the one place
// that actually needs them, rather than coupling the shared contract to this SDK.
export async function translateWithDeepL({
  apiKey,
  sourceLang,
  targetLang,
  lines,
  formality,
  modelType,
  glossaryId,
}: DeepLTranslationParams): Promise<DeepLTranslationResult> {
  const client = getSdkClient(apiKey);
  const texts = lines.map((line) => line.text);
  const baseOptions: deepl.TranslateTextOptions = {
    formality: formality as deepl.Formality | undefined,
    modelType: modelType as deepl.ModelType | undefined,
    splitSentences: 'nonewlines',
    preserveFormatting: true,
  };

  let results: deepl.TextResult[];
  try {
    results = await client.translateText(
      texts,
      sourceLang as deepl.SourceLanguageCode,
      targetLang as deepl.TargetLanguageCode,
      { ...baseOptions, ...(glossaryId ? { glossary: glossaryId } : {}) }
    );
  } catch (err) {
    if (!glossaryId) throw err;
    // The selected glossary may not cover this source/target pair, or may have been deleted on
    // DeepL's dashboard since the settings form last fetched the list -- glossary selection is
    // advisory (matching how glossaries are treated everywhere else in this app), so retry once
    // without it rather than blocking translation entirely.
    console.warn('[deepl] translate with glossary failed, retrying without it:', err);
    results = await client.translateText(
      texts,
      sourceLang as deepl.SourceLanguageCode,
      targetLang as deepl.TargetLanguageCode,
      baseOptions
    );
  }

  return lines.map((line, i) => ({ line: line.line, text: results[i]?.text ?? '' }));
}

// ── safeStorage-backed API key persistence ──────────────────────────────────
// Stored inside the app's existing electron-store config, not a separate file -- the protection
// comes from safeStorage's OS-level encryption, not from file location.
type StoredApiKey = { value: string; encrypted: boolean };
const DEEPL_API_KEY_STORE_KEY = 'deeplApiKeyEncrypted';

export function getDeepLApiKey(appStore: Store): string {
  const stored = appStore.get(DEEPL_API_KEY_STORE_KEY) as StoredApiKey | undefined;
  if (!stored?.value) return '';
  if (!stored.encrypted) return stored.value;
  try {
    return safeStorage.decryptString(Buffer.from(stored.value, 'base64'));
  } catch {
    return ''; // ciphertext unreadable (e.g. OS keychain unavailable) -- force re-entry
  }
}

export function setDeepLApiKey(appStore: Store, apiKey: string): void {
  if (!apiKey) {
    appStore.delete(DEEPL_API_KEY_STORE_KEY);
    return;
  }
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted: StoredApiKey = {
      value: safeStorage.encryptString(apiKey).toString('base64'),
      encrypted: true,
    };
    appStore.set(DEEPL_API_KEY_STORE_KEY, encrypted);
  } else {
    const plain: StoredApiKey = { value: apiKey, encrypted: false };
    appStore.set(DEEPL_API_KEY_STORE_KEY, plain);
  }
}

export function isDeepLEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

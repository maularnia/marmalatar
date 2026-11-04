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

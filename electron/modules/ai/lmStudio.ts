import { Chat, LMStudioClient, type LLMRespondOpts, type OngoingPrediction } from '@lmstudio/sdk';
import {
  buildStructuredBatchInstructions,
  buildStructuredBatchUserMessage,
  computeStructuredMaxTokens,
  parseStructuredBatchResponse,
} from './structuredBatchTranslation';
import type {
  LMStudioTranslationParams,
  LMStudioTranslationResult,
  TokenizeWithLMStudioParams,
} from '../../../bridge/definitions/lmStudio';

let cachedClient: LMStudioClient | null = null;
let cachedHost: string | null = null;

// LM Studio's WS connection is persistent across calls, so only reconnect when the host changes.
function getClient(host: string): LMStudioClient {
  if (cachedClient && cachedHost === host) {
    return cachedClient;
  }
  cachedClient = new LMStudioClient({ baseUrl: host });
  cachedHost = host;
  return cachedClient;
}

// requestId -> in-flight prediction, so a renderer-issued cancel can be routed to the right one.
const pendingPredictions = new Map<string, OngoingPrediction>();

export type LMStudioModelOption = {
  value: string;
  label: string;
};

export async function pingLMStudio(host: string): Promise<boolean> {
  try {
    await getClient(host).system.listDownloadedModels('llm');
    return true;
  } catch {
    return false;
  }
}

export async function listLMStudioModels(host: string): Promise<LMStudioModelOption[]> {
  let models;
  try {
    models = await getClient(host).system.listDownloadedModels('llm');
  } catch {
    throw new Error(
      'LM Studio backend seems to be down. Start the local server in LM Studio and try again.'
    );
  }
  if (!models.length) {
    throw new Error(
      'No downloaded models found. Download a model in the LM Studio app, it will then appear here.'
    );
  }
  return models.map((model) => ({ value: model.modelKey, label: model.displayName }));
}

export async function translateWithLMStudio({
  requestId,
  host,
  model: modelKey,
  lines,
  systemPrompt,
  contextLength,
  reasoningStartTag,
  reasoningEndTag,
  jsonSchema,
}: LMStudioTranslationParams): Promise<LMStudioTranslationResult> {
  const isStructured = lines.length > 1;
  const client = getClient(host);
  const model = await client.llm.model(modelKey, {
    config: contextLength ? { contextLength } : undefined,
  });
  const chat = Chat.from([
    {
      role: 'system',
      content: isStructured
        ? [systemPrompt, buildStructuredBatchInstructions()].join('\n\n')
        : systemPrompt,
    },
    {
      role: 'user',
      content: isStructured ? buildStructuredBatchUserMessage(lines) : lines[0].text,
    },
  ]);
  const opts: LLMRespondOpts = {
    ...(reasoningStartTag && reasoningEndTag
      ? {
          reasoningParsing: {
            enabled: true,
            startString: reasoningStartTag,
            endString: reasoningEndTag,
          },
        }
      : {}),
    ...(isStructured
      ? {
          structured: { type: 'json', jsonSchema },
          maxTokens: computeStructuredMaxTokens(lines.length, contextLength),
        }
      : {}),
  };
  const prediction = model.respond(chat, Object.keys(opts).length ? opts : undefined);
  pendingPredictions.set(requestId, prediction);
  try {
    const result = await prediction.result();
    if (result.stats.stopReason === 'userStopped') {
      throw new Error('Translation was cancelled.');
    }
    if (!isStructured) {
      return [{ line: lines[0].line, text: result.nonReasoningContent.trim() }];
    }
    const translations = parseStructuredBatchResponse(result.nonReasoningContent);
    return Array.from(translations, ([line, text]) => ({ line, text }));
  } finally {
    pendingPredictions.delete(requestId);
  }
}

export function cancelLMStudioRequest(requestId: string): void {
  void pendingPredictions.get(requestId)?.cancel();
}

export async function tokenizeWithLMStudio({
  host,
  model: modelKey,
  text,
}: TokenizeWithLMStudioParams): Promise<number> {
  const client = getClient(host);
  const model = await client.llm.model(modelKey);
  return model.countTokens(text);
}

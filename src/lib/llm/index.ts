import type { ProviderId, LLMProviderAdapter, LLMRequestOptions, LLMStreamCallbacks } from './types';
import { geminiProvider } from './providers/gemini';
import { claudeProvider } from './providers/claude';
import { openaiProvider } from './providers/openai';
import { getProviderForModel } from './models';
import { getApiKey } from './api-keys';

const adapters: Record<ProviderId, LLMProviderAdapter> = {
	gemini: geminiProvider,
	claude: claudeProvider,
	openai: openaiProvider
};

export function getAdapter(providerId: ProviderId): LLMProviderAdapter {
	return adapters[providerId];
}

export async function sendMessage(
	modelId: string,
	options: Omit<LLMRequestOptions, 'model'>,
	callbacks: LLMStreamCallbacks,
	signal?: AbortSignal
): Promise<void> {
	const provider = getProviderForModel(modelId);
	if (!provider) throw new Error(`Unknown model: ${modelId}`);

	const apiKey = getApiKey(provider.id);
	if (!apiKey) throw new Error(`API key not set for ${provider.name}`);

	const adapter = getAdapter(provider.id);
	await adapter.sendMessage(apiKey, { ...options, model: modelId }, callbacks, signal);
}

export type { ProviderId, LLMMessage, LLMRequestOptions, LLMStreamCallbacks, LLMUsage, LLMResponse, ApiKeys } from './types';
export { LLM_PROVIDERS, getModel, getProvider, getProviderForModel, getAllModels } from './models';
export { apiKeys, getApiKey, setApiKey, loadApiKeys } from './api-keys';

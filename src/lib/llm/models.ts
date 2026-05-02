import type { LLMProvider, ProviderId } from './types';

export const LLM_PROVIDERS: LLMProvider[] = [
	{
		id: 'gemini',
		name: 'Google Gemini',
		models: [
			{
				id: 'gemini-2.5-flash',
				name: 'Gemini 2.5 Flash',
				providerId: 'gemini',
				inputCostPer1MTokens: 0.15,
				outputCostPer1MTokens: 0.60
			},
			{
				id: 'gemini-2.5-pro',
				name: 'Gemini 2.5 Pro',
				providerId: 'gemini',
				inputCostPer1MTokens: 1.25,
				outputCostPer1MTokens: 10.00
			},
			{
				id: 'gemini-2.5-flash-lite',
				name: 'Gemini 2.5 Flash-Lite',
				providerId: 'gemini',
				inputCostPer1MTokens: 0.075,
				outputCostPer1MTokens: 0.30
			}
		]
	},
	{
		id: 'claude',
		name: 'Anthropic Claude',
		models: [
			{
				id: 'claude-opus-4-7',
				name: 'Claude Opus 4.7',
				providerId: 'claude',
				inputCostPer1MTokens: 15.00,
				outputCostPer1MTokens: 75.00
			},
			{
				id: 'claude-sonnet-4-6',
				name: 'Claude Sonnet 4.6',
				providerId: 'claude',
				inputCostPer1MTokens: 3.00,
				outputCostPer1MTokens: 15.00
			},
			{
				id: 'claude-haiku-4-5',
				name: 'Claude Haiku 4.5',
				providerId: 'claude',
				inputCostPer1MTokens: 0.80,
				outputCostPer1MTokens: 4.00
			}
		]
	},
	{
		id: 'openai',
		name: 'OpenAI',
		models: [
			{
				id: 'gpt-5.5',
				name: 'GPT-5.5',
				providerId: 'openai',
				inputCostPer1MTokens: 2.50,
				outputCostPer1MTokens: 10.00
			},
			{
				id: 'gpt-5.4',
				name: 'GPT-5.4',
				providerId: 'openai',
				inputCostPer1MTokens: 1.25,
				outputCostPer1MTokens: 5.00
			},
			{
				id: 'gpt-5.4-mini',
				name: 'GPT-5.4 Mini',
				providerId: 'openai',
				inputCostPer1MTokens: 0.15,
				outputCostPer1MTokens: 0.60
			}
		]
	}
];

export function getProvider(providerId: ProviderId): LLMProvider | undefined {
	return LLM_PROVIDERS.find((p) => p.id === providerId);
}

export function getModel(modelId: string) {
	for (const provider of LLM_PROVIDERS) {
		const model = provider.models.find((m) => m.id === modelId);
		if (model) return model;
	}
	return undefined;
}

export function getProviderForModel(modelId: string): LLMProvider | undefined {
	for (const provider of LLM_PROVIDERS) {
		if (provider.models.some((m) => m.id === modelId)) return provider;
	}
	return undefined;
}

export function getAllModels() {
	return LLM_PROVIDERS.flatMap((p) => p.models);
}

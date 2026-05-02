export type ProviderId = 'gemini' | 'claude' | 'openai';

export interface LLMModel {
	id: string;
	name: string;
	providerId: ProviderId;
	inputCostPer1MTokens: number;
	outputCostPer1MTokens: number;
}

export interface LLMProvider {
	id: ProviderId;
	name: string;
	models: LLMModel[];
}

export interface LLMMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface LLMRequestOptions {
	model: string;
	messages: LLMMessage[];
	maxTokens?: number;
	temperature?: number;
	stream?: boolean;
}

export interface LLMStreamCallbacks {
	onToken: (token: string) => void;
	onComplete: (fullText: string, usage?: LLMUsage) => void;
	onError: (error: Error) => void;
}

export interface LLMUsage {
	inputTokens: number;
	outputTokens: number;
}

export interface LLMResponse {
	content: string;
	usage?: LLMUsage;
}

export interface LLMProviderAdapter {
	providerId: ProviderId;
	sendMessage(
		apiKey: string,
		options: LLMRequestOptions,
		callbacks: LLMStreamCallbacks,
		signal?: AbortSignal
	): Promise<void>;
}

export interface ApiKeys {
	gemini?: string;
	claude?: string;
	openai?: string;
}

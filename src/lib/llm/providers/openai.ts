import type { LLMProviderAdapter, LLMRequestOptions, LLMStreamCallbacks, LLMUsage } from '../types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export const openaiProvider: LLMProviderAdapter = {
	providerId: 'openai',

	async sendMessage(
		apiKey: string,
		options: LLMRequestOptions,
		callbacks: LLMStreamCallbacks,
		signal?: AbortSignal
	): Promise<void> {
		const messages = options.messages.map((m) => ({
			role: m.role,
			content: m.content
		}));

		const body = {
			model: options.model,
			max_completion_tokens: options.maxTokens ?? 2048,
			temperature: options.temperature ?? 0.8,
			stream: true,
			stream_options: { include_usage: true },
			messages
		};

		const response = await fetch(OPENAI_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify(body),
			signal
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
		}

		const reader = response.body?.getReader();
		if (!reader) throw new Error('No response body');

		const decoder = new TextDecoder();
		let fullText = '';
		let buffer = '';
		const usage: LLMUsage = { inputTokens: 0, outputTokens: 0 };

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';

				for (const line of lines) {
					if (!line.startsWith('data: ')) continue;
					const jsonStr = line.slice(6).trim();
					if (!jsonStr || jsonStr === '[DONE]') continue;

					try {
						const data = JSON.parse(jsonStr);
						const text = data.choices?.[0]?.delta?.content;
						if (text) {
							fullText += text;
							callbacks.onToken(text);
						}
						if (data.usage) {
							usage.inputTokens = data.usage.prompt_tokens ?? 0;
							usage.outputTokens = data.usage.completion_tokens ?? 0;
						}
					} catch {
						// skip malformed JSON chunks
					}
				}
			}
		} finally {
			reader.releaseLock();
		}

		callbacks.onComplete(fullText, usage);
	}
};

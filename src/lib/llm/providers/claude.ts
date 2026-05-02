import type { LLMProviderAdapter, LLMRequestOptions, LLMStreamCallbacks, LLMUsage } from '../types';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export const claudeProvider: LLMProviderAdapter = {
	providerId: 'claude',

	async sendMessage(
		apiKey: string,
		options: LLMRequestOptions,
		callbacks: LLMStreamCallbacks,
		signal?: AbortSignal
	): Promise<void> {
		const systemContent = options.messages.find((m) => m.role === 'system')?.content;
		const messages = options.messages
			.filter((m) => m.role !== 'system')
			.map((m) => ({
				role: m.role as 'user' | 'assistant',
				content: m.content
			}));

		const body: Record<string, unknown> = {
			model: options.model,
			max_tokens: options.maxTokens ?? 2048,
			temperature: options.temperature ?? 0.8,
			stream: true,
			messages
		};

		if (systemContent) {
			body.system = systemContent;
		}

		const response = await fetch(CLAUDE_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': ANTHROPIC_VERSION,
				'anthropic-dangerous-direct-browser-access': 'true'
			},
			body: JSON.stringify(body),
			signal
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Claude API error (${response.status}): ${errorText}`);
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
						const event = JSON.parse(jsonStr);

						if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
							const text = event.delta.text;
							if (text) {
								fullText += text;
								callbacks.onToken(text);
							}
						}

						if (event.type === 'message_start' && event.message?.usage) {
							usage.inputTokens = event.message.usage.input_tokens ?? 0;
						}

						if (event.type === 'message_delta' && event.usage) {
							usage.outputTokens = event.usage.output_tokens ?? 0;
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

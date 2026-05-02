import type { LLMProviderAdapter, LLMRequestOptions, LLMStreamCallbacks, LLMUsage } from '../types';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export const geminiProvider: LLMProviderAdapter = {
	providerId: 'gemini',

	async sendMessage(
		apiKey: string,
		options: LLMRequestOptions,
		callbacks: LLMStreamCallbacks,
		signal?: AbortSignal
	): Promise<void> {
		const systemInstruction = options.messages.find((m) => m.role === 'system')?.content;
		const contents = options.messages
			.filter((m) => m.role !== 'system')
			.map((m) => ({
				role: m.role === 'assistant' ? 'model' : 'user',
				parts: [{ text: m.content }]
			}));

		const body: Record<string, unknown> = {
			contents,
			generationConfig: {
				maxOutputTokens: options.maxTokens ?? 2048,
				temperature: options.temperature ?? 0.8
			}
		};

		if (systemInstruction) {
			body.systemInstruction = { parts: [{ text: systemInstruction }] };
		}

		const url = `${GEMINI_API_BASE}/${options.model}:streamGenerateContent?alt=sse&key=${apiKey}`;

		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
			signal
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Gemini API error (${response.status}): ${errorText}`);
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

						// Check for safety filter block
						const finishReason = data.candidates?.[0]?.finishReason;
						if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
							const blockReason = data.candidates?.[0]?.safetyRatings
								?.filter((r: { blocked?: boolean }) => r.blocked)
								?.map((r: { category?: string }) => r.category)
								?.join(', ') ?? finishReason;
							throw new Error(`Gemini blocked response (${blockReason})`);
						}

						const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
						if (text) {
							fullText += text;
							callbacks.onToken(text);
						}
						if (data.usageMetadata) {
							usage.inputTokens = data.usageMetadata.promptTokenCount ?? 0;
							usage.outputTokens = data.usageMetadata.candidatesTokenCount ?? 0;
						}
					} catch (e) {
						if (e instanceof Error && e.message.startsWith('Gemini blocked')) throw e;
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

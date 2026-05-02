import { get } from 'svelte/store';
import { locale } from '$lib/i18n';
import { sendMessage } from '$lib/llm';
import { getModel } from '$lib/llm/models';
import { session } from '$lib/stores/session';
import { buildDiscussionPrompt, parseDiscussionResponse } from '$lib/prompts/discussion';
import type { Persona } from '$lib/types/persona';
import type { LLMUsage } from '$lib/llm';

const UTTERANCE_INTERVAL_MS = 1500;

export interface DiscussionEngineCallbacks {
	onUtterance: (personaId: string, content: string, round: number) => void;
	onRoundStart: (round: number) => void;
	onRoundEnd: (round: number) => void;
	onComplete: () => void;
	onError: (error: Error) => void;
	onUsageUpdate: (usage: LLMUsage) => void;
}

export class DiscussionEngine {
	private abortController: AbortController | null = null;
	private isPaused = false;
	private pauseResolve: (() => void) | null = null;
	private facilitatorComment = '';
	private totalUsage: LLMUsage = { inputTokens: 0, outputTokens: 0 };

	constructor(private callbacks: DiscussionEngineCallbacks) {}

	async start() {
		const s = get(session);
		if (!s) throw new Error('No session');

		this.isPaused = false;
		this.abortController = new AbortController();
		session.setStatus('running');

		try {
			for (let round = s.currentRound; round <= s.setup.rounds; round++) {
				session.setRound(round);
				this.callbacks.onRoundStart(round);

				await this.runRound(round);

				if (this.abortController?.signal.aborted) return;

				this.callbacks.onRoundEnd(round);
			}

			session.setStatus('completed');
			this.callbacks.onComplete();
		} catch (err) {
			if (this.abortController?.signal.aborted) return;
			session.setStatus('paused');
			this.callbacks.onError(err instanceof Error ? err : new Error(String(err)));
		}
	}

	private async runRound(round: number) {
		const s = get(session);
		if (!s) return;

		const personaCount = s.setup.personas.length;

		for (let i = 0; i < personaCount; i++) {
			if (this.abortController?.signal.aborted) return;

			if (this.isPaused) {
				await new Promise<void>((resolve) => {
					this.pauseResolve = resolve;
				});
			}

			if (this.abortController?.signal.aborted) return;

			await this.generateUtterance(round);
			await this.delay(UTTERANCE_INTERVAL_MS);
		}
	}

	private async generateUtterance(round: number) {
		const MAX_RETRIES = 2;
		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
			if (this.abortController?.signal.aborted) return;

			const s = get(session);
			if (!s) return;

			const prompt = buildDiscussionPrompt({
				theme: s.setup.theme,
				direction: s.setup.direction,
				personas: s.setup.personas,
				utterances: s.utterances,
				currentRound: round,
				maxRounds: s.setup.rounds,
				facilitatorComment: attempt === 0 ? this.facilitatorComment : '',
				locale: get(locale)
			});

			if (attempt === 0) this.facilitatorComment = '';

			let fullResponse = '';

			try {
				await sendMessage(
					s.setup.modelId,
					{
						messages: [{ role: 'user', content: prompt }],
						maxTokens: 2048,
						temperature: 0.85
					},
					{
						onToken: (token) => {
							fullResponse += token;
						},
						onComplete: (_text, usage) => {
							if (usage) {
								this.totalUsage.inputTokens += usage.inputTokens;
								this.totalUsage.outputTokens += usage.outputTokens;
								this.callbacks.onUsageUpdate({ ...this.totalUsage });
							}
						},
						onError: (err) => {
							throw err;
						}
					},
					this.abortController?.signal
				);

				const parsed = parseDiscussionResponse(fullResponse);
				const persona = this.findPersonaByName(parsed.speaker, s.setup.personas);
				const personaId = persona?.id ?? s.setup.personas[0].id;

				session.addUtterance(personaId, parsed.content, round);
				this.callbacks.onUtterance(personaId, parsed.content, round);
				return;
			} catch (err) {
				lastError = err instanceof Error ? err : new Error(String(err));
				console.warn(`[DiscussionEngine] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed:`, lastError.message);
				if (attempt < MAX_RETRIES) {
					await this.delay(2000);
				}
			}
		}

		throw lastError ?? new Error('Failed to generate utterance');
	}

	private findPersonaByName(name: string, personas: Persona[]): Persona | undefined {
		const normalized = name.trim();
		return (
			personas.find((p) => p.name === normalized) ??
			personas.find((p) => normalized.includes(p.name) || p.name.includes(normalized))
		);
	}

	pause() {
		this.isPaused = true;
		session.setStatus('paused');
	}

	resume() {
		this.isPaused = false;
		if (this.pauseResolve) {
			this.pauseResolve();
			this.pauseResolve = null;
		}
		session.setStatus('running');
	}

	intervene(comment: string) {
		const s = get(session);
		if (!s) return;
		this.facilitatorComment = comment;
		session.addFacilitatorComment(comment, s.currentRound);
	}

	stop() {
		this.abortController?.abort();
		this.abortController = null;
		if (this.pauseResolve) {
			this.pauseResolve();
			this.pauseResolve = null;
		}
	}

	getUsage(): LLMUsage {
		return { ...this.totalUsage };
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => {
			const timer = setTimeout(resolve, ms);
			this.abortController?.signal.addEventListener('abort', () => {
				clearTimeout(timer);
				resolve();
			});
		});
	}
}

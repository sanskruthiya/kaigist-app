import type { Persona } from '$lib/types/persona';

export interface VoiceSettings {
	pitch: number;
	rate: number;
	volume: number;
}

export interface SpeechCallbacks {
	onSpeechStart?: (personaId: string) => void;
	onSpeechEnd?: (personaId: string) => void;
}

export class SpeechSynthesizer {
	private synth: SpeechSynthesis;
	private currentUtterance: SpeechSynthesisUtterance | null = null;
	private queue: Array<{ text: string; personaId: string }> = [];
	private isPlaying = false;
	private enabled = false;
	private personas: Map<string, Persona> = new Map();
	private lang: string = 'ja-JP';
	private selectedVoice: SpeechSynthesisVoice | null = null;
	private callbacks: SpeechCallbacks = {};

	constructor(callbacks?: SpeechCallbacks) {
		if (typeof window === 'undefined') {
			throw new Error('SpeechSynthesizer can only be used in browser');
		}
		this.synth = window.speechSynthesis;
		this.callbacks = callbacks || {};
		this.loadVoices();
	}

	private loadVoices() {
		const setVoice = () => {
			const voices = this.synth.getVoices();
			this.selectedVoice = this.selectBestVoice(voices, this.lang);
			console.log('[SpeechSynthesizer] Selected voice:', this.selectedVoice?.name || 'default');
		};

		if (this.synth.getVoices().length > 0) {
			setVoice();
		} else {
			this.synth.addEventListener('voiceschanged', setVoice);
		}
	}

	private selectBestVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
		if (voices.length === 0) return null;

		const langPrefix = lang.split('-')[0];
		const matchingVoices = voices.filter(v => v.lang.startsWith(langPrefix));

		if (matchingVoices.length === 0) {
			return voices[0];
		}

		if (lang.startsWith('ja')) {
			const preferredNames = ['Kyoko', 'Otoya', 'Google 日本語', 'Microsoft Ayumi'];
			for (const name of preferredNames) {
				const voice = matchingVoices.find(v => v.name.includes(name));
				if (voice) return voice;
			}
		} else if (lang.startsWith('en')) {
			const preferredNames = ['Google US English', 'Microsoft David', 'Alex', 'Samantha'];
			for (const name of preferredNames) {
				const voice = matchingVoices.find(v => v.name.includes(name));
				if (voice) return voice;
			}
		}

		const localVoices = matchingVoices.filter(v => v.localService);
		if (localVoices.length > 0) {
			return localVoices[0];
		}

		return matchingVoices[0];
	}

	setLanguage(lang: 'ja' | 'en') {
		this.lang = lang === 'ja' ? 'ja-JP' : 'en-US';
		const voices = this.synth.getVoices();
		this.selectedVoice = this.selectBestVoice(voices, this.lang);
		console.log('[SpeechSynthesizer] Language changed, selected voice:', this.selectedVoice?.name || 'default');
	}

	setPersonas(personas: Persona[]) {
		this.personas.clear();
		personas.forEach(p => this.personas.set(p.id, p));
	}

	setEnabled(enabled: boolean) {
		this.enabled = enabled;
		if (!enabled) {
			this.stop();
		}
	}

	isEnabled(): boolean {
		return this.enabled;
	}

	speak(text: string, personaId: string) {
		if (!this.enabled) return;

		this.queue.push({ text, personaId });
		if (!this.isPlaying) {
			this.processQueue();
		}
	}

	private processQueue() {
		if (this.queue.length === 0) {
			this.isPlaying = false;
			return;
		}

		this.isPlaying = true;
		const { text, personaId } = this.queue.shift()!;

		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = this.lang;
		if (this.selectedVoice) {
			utterance.voice = this.selectedVoice;
		}
		utterance.pitch = 1.0;
		utterance.rate = 1.0;
		utterance.volume = 1.0;

		utterance.onstart = () => {
			this.callbacks.onSpeechStart?.(personaId);
		};

		utterance.onend = () => {
			this.callbacks.onSpeechEnd?.(personaId);
			this.currentUtterance = null;
			setTimeout(() => this.processQueue(), 300);
		};

		utterance.onerror = (event) => {
			console.error('[SpeechSynthesizer] Error:', event);
			this.callbacks.onSpeechEnd?.(personaId);
			this.currentUtterance = null;
			this.processQueue();
		};

		this.currentUtterance = utterance;
		this.synth.speak(utterance);
	}


	stop() {
		this.queue = [];
		this.isPlaying = false;
		if (this.synth.speaking) {
			this.synth.cancel();
		}
		this.currentUtterance = null;
	}

	pause() {
		if (this.synth.speaking) {
			this.synth.pause();
		}
	}

	resume() {
		if (this.synth.paused) {
			this.synth.resume();
		}
	}

	isSpeaking(): boolean {
		return this.synth.speaking;
	}
}

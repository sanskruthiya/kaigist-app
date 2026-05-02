import { writable, derived } from 'svelte/store';
import ja from './ja.json';
import en from './en.json';

export type Locale = 'ja' | 'en';
export type TranslationKey = keyof typeof ja;

const translations: Record<Locale, Record<string, string>> = { ja, en };

const STORAGE_KEY = 'kaigist-locale';

function getInitialLocale(): Locale {
	if (typeof window !== 'undefined') {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === 'ja' || stored === 'en') return stored;
	}
	return 'ja';
}

export const locale = writable<Locale>(getInitialLocale());

locale.subscribe((value) => {
	if (typeof window !== 'undefined') {
		localStorage.setItem(STORAGE_KEY, value);
	}
});

export const t = derived(locale, ($locale) => {
	return (key: TranslationKey): string => {
		return translations[$locale][key] ?? key;
	};
});

export function toggleLocale() {
	locale.update((current) => (current === 'ja' ? 'en' : 'ja'));
}

import { writable, get } from 'svelte/store';
import type { ApiKeys, ProviderId } from './types';

const STORAGE_KEY = 'kaigist-api-keys';

function loadFromStorage(): ApiKeys {
	if (typeof window === 'undefined') return {};
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? JSON.parse(stored) : {};
	} catch {
		return {};
	}
}

function saveToStorage(keys: ApiKeys): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export const apiKeys = writable<ApiKeys>(loadFromStorage());

apiKeys.subscribe((keys) => {
	saveToStorage(keys);
});

export function getApiKey(providerId: ProviderId): string | undefined {
	return get(apiKeys)[providerId];
}

export function setApiKey(providerId: ProviderId, key: string): void {
	apiKeys.update((keys) => ({ ...keys, [providerId]: key || undefined }));
}

export function loadApiKeys(): void {
	apiKeys.set(loadFromStorage());
}

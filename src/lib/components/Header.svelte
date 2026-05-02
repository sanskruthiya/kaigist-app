<script lang="ts">
	import { Settings, Globe, Eye, EyeOff, Check } from 'lucide-svelte';
	import { t, toggleLocale, locale } from '$lib/i18n';
	import { LLM_PROVIDERS, apiKeys, setApiKey } from '$lib/llm';
	import type { ProviderId } from '$lib/llm';

	let showSettings = $state(false);
	let activeTab = $state<ProviderId>('gemini');
	let showKey = $state<Record<ProviderId, boolean>>({ gemini: false, claude: false, openai: false });
	let savedFeedback = $state<ProviderId | null>(null);

	function handleSave(providerId: ProviderId, value: string) {
		setApiKey(providerId, value.trim());
		savedFeedback = providerId;
		setTimeout(() => { if (savedFeedback === providerId) savedFeedback = null; }, 1500);
	}
</script>

<header class="flex items-center justify-between px-3 sm:px-4 py-2 bg-white border-b border-gray-200 shadow-sm">
	<a href="/" class="flex items-center gap-2 shrink-0">
		<img src="/images/kAIgistLogo.webp" alt="Kaigist" class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg" />
		<span class="text-lg sm:text-xl font-bold text-gray-900">{$t('app_name')}</span>
		<span class="hidden md:inline text-sm text-gray-500">{$t('app_tagline')}</span>
	</a>

	<div class="flex items-center gap-2">
		<button
			onclick={toggleLocale}
			class="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
			title={$t('nav_language')}
		>
			<Globe size={16} />
			<span class="uppercase text-xs font-medium">{$locale}</span>
		</button>

		<button
			onclick={() => (showSettings = true)}
			class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
			title={$t('nav_api_settings')}
		>
			<Settings size={20} />
			<span class="sr-only">{$t('nav_api_settings')}</span>
		</button>
	</div>
</header>

{#if showSettings}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) showSettings = false; }}
		onkeydown={(e) => { if (e.key === 'Escape') showSettings = false; }}
	>
		<div class="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-lg font-bold">{$t('settings_title')}</h2>
				<button
					onclick={() => (showSettings = false)}
					class="p-1 text-gray-400 hover:text-gray-600 rounded"
				>
					✕
				</button>
			</div>

			<!-- Provider tabs -->
			<div class="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
				{#each LLM_PROVIDERS as provider}
					<button
						class="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors {activeTab === provider.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
						onclick={() => (activeTab = provider.id)}
					>
						{provider.name}
					</button>
				{/each}
			</div>

			<!-- API key input for active provider -->
			{#each LLM_PROVIDERS as provider}
				{#if provider.id === activeTab}
					<div class="space-y-4">
						<div>
							<label for="api-key-{provider.id}" class="block text-sm font-medium text-gray-700 mb-2">
								{provider.name} {$t('settings_api_key_label')}
							</label>
							<div class="relative">
								<input
									id="api-key-{provider.id}"
									type={showKey[provider.id] ? 'text' : 'password'}
									value={$apiKeys[provider.id] ?? ''}
									oninput={(e) => handleSave(provider.id, e.currentTarget.value)}
									class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all text-sm font-mono"
									placeholder={$t('settings_api_key_placeholder')}
								/>
								<button
									onclick={() => (showKey[provider.id] = !showKey[provider.id])}
									class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
								>
									{#if showKey[provider.id]}
										<EyeOff size={18} />
									{:else}
										<Eye size={18} />
									{/if}
								</button>
							</div>
							{#if savedFeedback === provider.id}
								<div class="flex items-center gap-1 mt-2 text-green-600 text-xs">
									<Check size={14} />
									<span>Saved</span>
								</div>
							{/if}
						</div>

						<div class="text-xs text-gray-400">
							<p class="mb-1">Models:</p>
							<ul class="space-y-0.5">
								{#each provider.models as model}
									<li><code class="bg-gray-100 px-1 rounded">{model.id}</code> — {model.name}</li>
								{/each}
							</ul>
						</div>
					</div>
				{/if}
			{/each}

			<div class="flex justify-end mt-6">
				<button
					onclick={() => (showSettings = false)}
					class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
				>
					{$t('settings_close')}
				</button>
			</div>
		</div>
	</div>
{/if}

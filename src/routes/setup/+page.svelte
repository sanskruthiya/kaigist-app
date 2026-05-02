<script lang="ts">
	import { ArrowLeft, ArrowRight, Rocket, Sparkles, AlertTriangle, Pencil, Trash2, Plus, RefreshCw, Loader2, X } from 'lucide-svelte';
	import { t, locale } from '$lib/i18n';
	import { LLM_PROVIDERS, apiKeys, getProviderForModel, sendMessage } from '$lib/llm';
	import type { Persona } from '$lib/types/persona';
	import { assignColor, generateId } from '$lib/types/persona';
	import { buildPersonaProposalPrompt, parsePersonaResponse } from '$lib/prompts/persona-proposal';
	import { session } from '$lib/stores/session';
	import { goto } from '$app/navigation';

	let currentStep = $state(1);
	const totalSteps = 3;

	// Step 1 state
	let theme = $state('');
	let supplement = $state('');
	let selectedModel = $state('gemini-2.5-flash');

	// Step 2 state
	let personas = $state<Persona[]>([]);
	let isProposing = $state(false);
	let proposalError = $state('');
	let editingPersona = $state<Persona | null>(null);
	let isAddingNew = $state(false);

	// Step 3 state
	let rounds = $state(5);
	let direction = $state('');

	const stepLabels: Array<'setup_step_theme' | 'setup_step_personas' | 'setup_step_settings'> = [
		'setup_step_theme',
		'setup_step_personas',
		'setup_step_settings'
	];

	const hasApiKeyForModel = $derived(() => {
		const provider = getProviderForModel(selectedModel);
		if (!provider) return false;
		return !!$apiKeys[provider.id];
	});

	const canProceedStep1 = $derived(() => theme.trim().length > 0 && hasApiKeyForModel());
	const canProceedStep2 = $derived(() => personas.length >= 4);

	async function proposePersonas() {
		if (!theme.trim()) return;
		isProposing = true;
		proposalError = '';

		const prompt = buildPersonaProposalPrompt(theme, supplement, 5, $locale);
		let fullResponse = '';

		try {
			await sendMessage(
				selectedModel,
				{
					messages: [
						{ role: 'user', content: prompt }
					],
					maxTokens: 2048,
					temperature: 0.9
				},
				{
					onToken: (token) => { fullResponse += token; },
					onComplete: () => {},
					onError: (err) => { throw err; }
				}
			);
			personas = parsePersonaResponse(fullResponse);
		} catch (err) {
			proposalError = err instanceof Error ? err.message : String(err);
		} finally {
			isProposing = false;
		}
	}

	function handleStep1Submit() {
		if (!canProceedStep1()) return;
		proposePersonas();
		currentStep = 2;
	}

	function deletePersona(id: string) {
		personas = personas.filter((p) => p.id !== id);
	}

	function openEditModal(persona: Persona) {
		editingPersona = { ...persona };
		isAddingNew = false;
	}

	function openAddModal() {
		editingPersona = {
			id: generateId(),
			name: '',
			ageGroup: '',
			expertise: '',
			stance: '',
			personality: '',
			color: assignColor(personas.length)
		};
		isAddingNew = true;
	}

	function savePersona() {
		if (!editingPersona || !editingPersona.name.trim()) return;
		if (isAddingNew) {
			personas = [...personas, editingPersona];
		} else {
			personas = personas.map((p) => (p.id === editingPersona!.id ? editingPersona! : p));
		}
		editingPersona = null;
	}
</script>

<div class="max-w-2xl mx-auto px-4 py-8">
	<!-- Step indicator -->
	<div class="flex items-center justify-between mb-8">
		{#if currentStep === 1}
			<a href="/" class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
				<ArrowLeft size={16} />
				{$t('btn_back')}
			</a>
		{:else}
			<button
				class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
				onclick={() => (currentStep -= 1)}
			>
				<ArrowLeft size={16} />
				{$t('btn_back')}
			</button>
		{/if}
		<div class="flex items-center gap-2 text-sm text-gray-500">
			<span>{$t('setup_step')} {currentStep}/{totalSteps}</span>
			<span class="text-gray-300">—</span>
			<span class="font-medium text-gray-700">{$t(stepLabels[currentStep - 1])}</span>
		</div>
	</div>

	<!-- Step progress bar -->
	<div class="flex gap-2 mb-8">
		{#each Array(totalSteps) as _, i}
			<div
				class="h-1 flex-1 rounded-full transition-colors {i < currentStep
					? 'bg-amber-400'
					: 'bg-gray-200'}"
			></div>
		{/each}
	</div>

	<!-- ========== Step 1: Theme + Model ========== -->
	{#if currentStep === 1}
		<div class="space-y-6">
			<div>
				<label for="theme" class="block text-sm font-medium text-gray-700 mb-2">
					{$t('setup_theme_label')}
				</label>
				<input
					id="theme"
					type="text"
					maxlength={100}
					bind:value={theme}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all"
					placeholder={$t('setup_theme_placeholder')}
				/>
			</div>
			<div>
				<label for="supplement" class="block text-sm font-medium text-gray-700 mb-2">
					{$t('setup_supplement_label')}
				</label>
				<textarea
					id="supplement"
					rows={4}
					maxlength={500}
					bind:value={supplement}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all resize-none"
					placeholder={$t('setup_supplement_placeholder')}
				></textarea>
			</div>

			<div>
				<label for="model" class="block text-sm font-medium text-gray-700 mb-2">
					{$t('setup_model_label')}
				</label>
				<select
					id="model"
					bind:value={selectedModel}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all"
				>
					{#each LLM_PROVIDERS as provider}
						<optgroup label={provider.name}>
							{#each provider.models as model}
								<option value={model.id}>{model.name}</option>
							{/each}
						</optgroup>
					{/each}
				</select>

				{#if !hasApiKeyForModel()}
					<div class="flex items-center gap-2 mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
						<AlertTriangle size={16} />
						<span>{$t('error_no_api_key')}</span>
					</div>
				{/if}
			</div>

			<button
				disabled={!canProceedStep1()}
				class="w-full flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-lg transition-colors {canProceedStep1() ? 'bg-amber-400 hover:bg-amber-500 text-gray-900' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}"
				onclick={handleStep1Submit}
			>
				<Sparkles size={18} />
				{$t('setup_suggest_personas')}
			</button>
		</div>
	{/if}

	<!-- ========== Step 2: Personas ========== -->
	{#if currentStep === 2}
		<div class="space-y-6">
			{#if isProposing}
				<div class="flex flex-col items-center justify-center py-16 text-gray-500">
					<Loader2 size={32} class="animate-spin mb-4" />
					<p class="text-sm">{$t('setup_proposing_personas')}</p>
				</div>
			{:else if proposalError}
				<div class="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
					<p class="font-medium mb-1">{$t('error_api')}</p>
					<p class="text-xs text-red-500">{proposalError}</p>
				</div>
				<button
					class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-500 text-gray-900 font-medium rounded-lg transition-colors"
					onclick={proposePersonas}
				>
					<RefreshCw size={16} />
					{$t('btn_retry')}
				</button>
			{:else}
				<!-- Persona cards -->
				<div class="space-y-3">
					{#each personas as persona, i (persona.id)}
						<div class="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
							<div
								class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
								style="background-color: {persona.color}"
							>
								{persona.name.charAt(0)}
							</div>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2">
									<span class="font-medium text-gray-900">{persona.name}</span>
									<span class="text-xs text-gray-400">{persona.ageGroup}</span>
								</div>
								<p class="text-sm text-gray-600 mt-0.5">{persona.expertise}</p>
								<div class="flex items-center gap-2 mt-1">
									<span class="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{persona.stance}</span>
									<span class="text-xs text-gray-400">{persona.personality}</span>
								</div>
							</div>
							<div class="flex items-center gap-1 shrink-0">
								<button
									onclick={() => openEditModal(persona)}
									class="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
									title={$t('setup_edit_persona')}
								>
									<Pencil size={14} />
								</button>
								{#if personas.length > 4}
									<button
										onclick={() => deletePersona(persona.id)}
										class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
										title={$t('btn_delete')}
									>
										<Trash2 size={14} />
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				<!-- Actions -->
				<div class="flex flex-wrap gap-2">
					{#if personas.length < 8}
						<button
							onclick={openAddModal}
							class="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
						>
							<Plus size={14} />
							{$t('setup_add_persona')}
						</button>
					{:else}
						<span class="text-xs text-gray-400 py-2">{$t('setup_persona_max')}</span>
					{/if}
					<button
						onclick={proposePersonas}
						class="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
					>
						<RefreshCw size={14} />
						{$t('setup_regenerate_personas')}
					</button>
				</div>
			{/if}

			{#if !isProposing}
				<div class="flex justify-between pt-4">
					<button
						class="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
						onclick={() => (currentStep = 1)}
					>
						<ArrowLeft size={16} />
						{$t('btn_back')}
					</button>
					<button
						disabled={!canProceedStep2()}
						class="flex items-center gap-1 px-6 py-2 text-sm font-medium rounded-lg transition-colors {canProceedStep2() ? 'bg-amber-400 hover:bg-amber-500 text-gray-900' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}"
						onclick={() => (currentStep = 3)}
					>
						{$t('btn_next')}
						<ArrowRight size={16} />
					</button>
				</div>
			{/if}

			{#if !canProceedStep2() && personas.length > 0 && personas.length < 4}
				<p class="text-xs text-amber-600">{$t('error_min_personas')}</p>
			{/if}
		</div>
	{/if}

	<!-- ========== Step 3: Discussion settings ========== -->
	{#if currentStep === 3}
		<div class="space-y-6">
			<div>
				<label for="rounds" class="block text-sm font-medium text-gray-700 mb-2">
					{$t('setup_rounds_label')}
				</label>
				<select
					id="rounds"
					bind:value={rounds}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all"
				>
					{#each Array.from({ length: 10 }, (_, i) => i + 1) as n}
						<option value={n}>{n}</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="direction" class="block text-sm font-medium text-gray-700 mb-2">
					{$t('setup_direction_label')}
				</label>
				<textarea
					id="direction"
					rows={3}
					bind:value={direction}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all resize-none"
					placeholder={$t('setup_direction_placeholder')}
				></textarea>
			</div>

			<div class="flex justify-between">
				<button
					class="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
					onclick={() => (currentStep = 2)}
				>
					<ArrowLeft size={16} />
					{$t('btn_back')}
				</button>
				<button
					class="flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-500 text-gray-900 font-medium rounded-lg transition-colors"
					onclick={() => {
						session.init({
							theme,
							supplement,
							personas,
							rounds,
							direction,
							modelId: selectedModel
						});
						goto('/discussion');
					}}
				>
					<Rocket size={18} />
					{$t('setup_start_discussion')}
				</button>
			</div>
		</div>
	{/if}
</div>

<!-- ========== Edit/Add Persona Modal ========== -->
{#if editingPersona}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) editingPersona = null; }}
		onkeydown={(e) => { if (e.key === 'Escape') editingPersona = null; }}
	>
		<div class="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-lg font-bold">
					{isAddingNew ? $t('setup_persona_add_title') : $t('setup_persona_edit_title')}
				</h2>
				<button
					onclick={() => (editingPersona = null)}
					class="p-1 text-gray-400 hover:text-gray-600 rounded"
				>
					<X size={20} />
				</button>
			</div>

			<div class="space-y-4">
				<div>
					<label for="p-name" class="block text-xs font-medium text-gray-600 mb-1">{$t('setup_persona_name')}</label>
					<input id="p-name" type="text" bind:value={editingPersona.name} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none" />
				</div>
				<div>
					<label for="p-age" class="block text-xs font-medium text-gray-600 mb-1">{$t('setup_persona_age_group')}</label>
					<input id="p-age" type="text" bind:value={editingPersona.ageGroup} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none" placeholder="30代" />
				</div>
				<div>
					<label for="p-exp" class="block text-xs font-medium text-gray-600 mb-1">{$t('setup_persona_expertise')}</label>
					<input id="p-exp" type="text" bind:value={editingPersona.expertise} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none" />
				</div>
				<div>
					<label for="p-stance" class="block text-xs font-medium text-gray-600 mb-1">{$t('setup_persona_stance')}</label>
					<input id="p-stance" type="text" bind:value={editingPersona.stance} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none" />
				</div>
				<div>
					<label for="p-personality" class="block text-xs font-medium text-gray-600 mb-1">{$t('setup_persona_personality')}</label>
					<input id="p-personality" type="text" bind:value={editingPersona.personality} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none" />
				</div>

				<div class="flex items-center gap-3 pt-2">
					<span class="text-xs font-medium text-gray-600">{$t('setup_persona_name')} color:</span>
					<div
						class="w-8 h-8 rounded-full border-2 border-white shadow"
						style="background-color: {editingPersona.color}"
					></div>
				</div>
			</div>

			<div class="flex justify-end gap-2 mt-6">
				<button
					onclick={() => (editingPersona = null)}
					class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
				>
					{$t('btn_cancel')}
				</button>
				<button
					onclick={savePersona}
					disabled={!editingPersona.name.trim()}
					class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {editingPersona.name.trim() ? 'bg-amber-400 hover:bg-amber-500 text-gray-900' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}"
				>
					{$t('btn_save')}
				</button>
			</div>
		</div>
	</div>
{/if}

<svelte:head>
	<meta property="og:type" content="article" />
	<meta name="description" content="AI議論シミュレーション - {$session?.setup.theme ?? ''}" />
</svelte:head>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { Pause, Play, MessageSquare, FileText, Loader2, Mic, AlertTriangle, PlusCircle, Download, Users, X, Volume2, VolumeX } from 'lucide-svelte';
	import { t, locale } from '$lib/i18n';
	import { goto } from '$app/navigation';
	import { session, currentPersonas, currentUtterances, currentRound, maxRounds, sessionStatus } from '$lib/stores/session';
	import { getModel } from '$lib/llm/models';
	import { DiscussionEngine } from '$lib/engine/discussion-engine';
	import type { LLMUsage } from '$lib/llm';
	import { exportJSON } from '$lib/utils/export';
	import TypingText from '$lib/components/TypingText.svelte';
	import { SpeechSynthesizer } from '$lib/audio/speech-synthesizer';

	let engine: DiscussionEngine | null = null;
	let speechSynth = $state<SpeechSynthesizer | null>(null);
	let voiceEnabled = $state(false);
	let speakingPersonaId = $state<string | null>(null);
	let usage = $state<LLMUsage>({ inputTokens: 0, outputTokens: 0 });
	let errorMsg = $state('');
	let showIntervene = $state(false);
	let interveneText = $state('');
	let interveneType = $state('add_topic');
	let timelineEl: HTMLDivElement | undefined = $state();
	let showDrawer = $state(false);
	let typingUtteranceId = $state<string | null>(null);

	const personaMap = $derived(() => {
		const map = new SvelteMap<string, { name: string; color: string }>();
		for (const p of $currentPersonas) {
			map.set(p.id, { name: p.name, color: p.color });
		}
		return map;
	});

	function estimateCost(): string {
		const s = $session;
		if (!s) return '$0.00';
		const model = getModel(s.setup.modelId);
		if (!model) return '$0.00';
		const cost =
			(usage.inputTokens / 1_000_000) * model.inputCostPer1MTokens +
			(usage.outputTokens / 1_000_000) * model.outputCostPer1MTokens;
		return `$${cost.toFixed(4)}`;
	}

	function startEngine() {
		if (!$session) return;
		errorMsg = '';
		engine = new DiscussionEngine({
			onUtterance: (personaId, content) => {
				// Get the latest utterance ID
				const utterances = $currentUtterances;
				const latestUtterance = utterances[utterances.length - 1];
				if (latestUtterance) {
					typingUtteranceId = latestUtterance.id;
					// Clear typing state after animation completes (estimate: 30ms per char)
					const typingDuration = content.length * 30 + 100;
					setTimeout(() => {
						typingUtteranceId = null;
					}, typingDuration);
				}
				// Voice synthesis
				if (speechSynth && voiceEnabled) {
					speechSynth.speak(content, personaId);
				}
			},
			onRoundStart: () => {},
			onRoundEnd: () => {},
			onComplete: () => {},
			onError: (err) => { errorMsg = err.message; },
			onUsageUpdate: (u) => { usage = u; }
		});
		engine.start();
	}

	function handlePause() {
		engine?.pause();
		speechSynth?.pause();
	}

	function handleResume() {
		if (engine) {
			engine.resume();
			speechSynth?.resume();
		} else {
			startEngine();
		}
	}

	function toggleVoice() {
		voiceEnabled = !voiceEnabled;
		if (speechSynth) {
			speechSynth.setEnabled(voiceEnabled);
			if (!voiceEnabled) {
				speechSynth.stop();
			}
		}
	}

	function handleIntervene() {
		if (!interveneText.trim()) return;
		const prefix = interveneType === 'add_topic' ? '【論点追加】'
			: interveneType === 'change_direction' ? '【方向転換】'
			: interveneType === 'ask_persona' ? '【質問】'
			: '【まとめ指示】';
		engine?.intervene(`${prefix} ${interveneText.trim()}`);
		interveneText = '';
		showIntervene = false;
		
		// 自動的に議論を再開
		if ($sessionStatus === 'paused') {
			handleResume();
		}
	}

	function handleExtend() {
		if (!$session) return;
		session.extendRounds(3);
		session.setStatus('paused');
		interveneType = 'summarize';
		showIntervene = true;
	}

	onMount(() => {
		session.load();
		if (!$session) {
			goto('/setup');
			return;
		}
		// Initialize speech synthesizer
		try {
			speechSynth = new SpeechSynthesizer({
				onSpeechStart: (personaId) => {
					speakingPersonaId = personaId;
				},
				onSpeechEnd: (personaId) => {
					if (speakingPersonaId === personaId) {
						speakingPersonaId = null;
					}
				}
			});
			speechSynth.setLanguage($locale);
			speechSynth.setPersonas($currentPersonas);
		} catch (err) {
			console.warn('[Discussion] Speech synthesis not available:', err);
		}
		if ($session.status === 'running' || $session.status === 'setup') {
			startEngine();
		}
	});

	onDestroy(() => {
		engine?.stop();
		speechSynth?.stop();
	});
</script>

{#if !$session}
	<div class="flex items-center justify-center h-[calc(100vh-57px)]">
		<div class="text-center">
			<p class="text-gray-500 mb-4">{$t('discussion_no_session')}</p>
			<a href="/setup" class="text-amber-600 hover:underline">{$t('btn_back')}</a>
		</div>
	</div>
{:else}
	<div class="flex flex-col lg:flex-row h-[calc(100vh-57px)]">
		<!-- Mobile top bar -->
		<div class="lg:hidden flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200">
			<button onclick={() => (showDrawer = true)} class="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
				<Users size={16} />
				{$t('discussion_personas')}
			</button>
			<span class="text-xs text-gray-500 truncate max-w-[50%]">{$session.setup.theme}</span>
			<span class="text-xs text-gray-400">R{$currentRound}/{$maxRounds}</span>
		</div>

		<!-- Sidebar (desktop) -->
		<aside class="hidden lg:flex flex-col w-64 border-r border-gray-200 bg-white">
			<!-- Theme -->
			<div class="p-4 border-b border-gray-100">
				<h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{$session.setup.theme}</h2>
			</div>

			<!-- Personas -->
			<div class="p-4 flex-1 overflow-y-auto">
				<h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{$t('discussion_personas')}</h3>
				<div class="space-y-2">
					{#each $currentPersonas as persona (persona.id)}
						<div class="flex items-center gap-2">
							<div
								class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
								style="background-color: {persona.color}"
							>
								{persona.name.charAt(0)}
							</div>
							<div class="min-w-0">
								<p class="text-sm font-medium text-gray-800 truncate">{persona.name}</p>
								<p class="text-xs text-gray-400 truncate">{persona.stance}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Controls -->
			<div class="p-4 border-t border-gray-100 space-y-2">
				<h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{$t('discussion_controls')}</h3>
				
				<!-- Voice toggle -->
				{#if speechSynth}
					<button 
						onclick={toggleVoice} 
						class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors {voiceEnabled ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'text-gray-700 hover:bg-gray-100'}"
					>
						{#if voiceEnabled}
							<Volume2 size={16} />
							{$t('discussion_voice_on')}
						{:else}
							<VolumeX size={16} />
							{$t('discussion_voice_off')}
						{/if}
					</button>
				{/if}
				
				{#if $sessionStatus === 'running'}
					<button onclick={handlePause} class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
						<Pause size={16} />
						{$t('discussion_pause')}
					</button>
				{:else if $sessionStatus === 'paused'}
					<button onclick={handleResume} class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
						<Play size={16} />
						{$t('discussion_resume')}
					</button>
					<button onclick={() => (showIntervene = true)} class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
						<MessageSquare size={16} />
						{$t('discussion_intervene')}
					</button>
				{/if}
				{#if $sessionStatus === 'completed'}
					<button onclick={() => goto('/notes')} class="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 rounded-lg transition-colors">
						<FileText size={16} />
						{$t('discussion_generate_notes')}
					</button>
					<button onclick={handleExtend} class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
						<PlusCircle size={16} />
						{$t('discussion_extend')}
					</button>
				{/if}
				<button onclick={() => { if ($session) exportJSON($session); }} class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
					<Download size={16} />
					{$t('discussion_export')}
				</button>
			</div>
		</aside>

		<!-- Main Timeline -->
		<div class="flex-1 flex flex-col">
			<div class="flex-1 overflow-y-auto p-4 lg:p-8" bind:this={timelineEl}>
				<article class="max-w-3xl mx-auto space-y-4">
					<header>
						<h1 class="sr-only">{$session?.setup.theme ?? 'AI議論'}</h1>
					</header>
					{#each $currentUtterances as utterance (utterance.id)}
						{@const isFacilitator = utterance.speakerPersonaId === '__facilitator__'}
						{@const info = personaMap().get(utterance.speakerPersonaId)}
						{@const isSpeaking = voiceEnabled && speakingPersonaId === utterance.speakerPersonaId}

						{#if isFacilitator}
							<!-- Facilitator comment -->
							<aside class="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
								<div class="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white shrink-0" aria-hidden="true">
									<Mic size={14} />
								</div>
								<div>
									<p class="text-xs font-semibold text-amber-700 mb-1">{$t('discussion_facilitator')}</p>
									<p class="text-sm text-amber-900">
										{#if typingUtteranceId === utterance.id}
											<TypingText text={utterance.content} speed={30} />
										{:else}
											{utterance.content}
										{/if}
									</p>
								</div>
							</aside>
						{:else}
							<!-- Persona utterance -->
							<section class="flex items-start gap-3 px-3 py-2 rounded-lg transition-colors {isSpeaking ? 'bg-yellow-50' : ''}">
								<div
									class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
									style="background-color: {info?.color ?? '#6B7280'}"
									aria-hidden="true"
								>
									{info?.name?.charAt(0) ?? '?'}
								</div>
								<div class="flex-1 min-w-0">
									<header class="flex items-center gap-2 mb-1">
										<h2 class="text-sm font-semibold" style="color: {info?.color ?? '#6B7280'}">{info?.name ?? '?'}</h2>
										<span class="text-xs text-gray-300" aria-label="Round {utterance.round}">R{utterance.round}</span>
										{#if isSpeaking}
											<Volume2 size={14} class="text-yellow-600 animate-pulse" aria-label="Speaking" />
										{/if}
									</header>
									<p class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
										{#if typingUtteranceId === utterance.id}
											<TypingText text={utterance.content} speed={30} />
										{:else}
											{utterance.content}
										{/if}
									</p>
								</div>
							</section>
						{/if}
					{/each}

					{#if $sessionStatus === 'running'}
						<div class="flex items-center gap-2 text-gray-400 py-4" role="status" aria-live="polite">
							<Loader2 size={16} class="animate-spin" />
							<span class="text-sm">{$t('status_round_progress')}...</span>
						</div>
					{/if}

					{#if errorMsg}
						<div class="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
							<div class="flex items-start gap-2">
								<AlertTriangle size={16} class="text-red-600 shrink-0 mt-0.5" />
								<p class="text-sm text-red-800">{errorMsg}</p>
							</div>
						</div>
					{/if}
				</article>
			</div>

			<!-- Status bar -->
			<div class="flex items-center justify-between px-4 py-2 bg-white border-t border-gray-200 text-xs text-gray-500">
				<span>
					{$t('discussion_round')} {$currentRound}/{$maxRounds}
					{#if $sessionStatus === 'running'}— {$t('status_round_progress')}{/if}
					{#if $sessionStatus === 'paused'}— {$t('discussion_pause')}{/if}
					{#if $sessionStatus === 'completed'}— {$t('status_completed')}{/if}
				</span>
				<span>{$t('status_tokens')}: {(usage.inputTokens + usage.outputTokens).toLocaleString()} / {$t('status_cost')}: {estimateCost()}</span>
			</div>
		</div>

		<!-- Mobile floating controls -->
		<div class="lg:hidden fixed bottom-16 right-4 flex flex-col gap-2 z-30">
			{#if $sessionStatus === 'running'}
				<button onclick={handlePause} class="p-3 bg-amber-400 text-gray-900 rounded-full shadow-lg hover:bg-amber-500 transition-colors">
					<Pause size={20} />
				</button>
			{:else if $sessionStatus === 'paused'}
				<button onclick={handleResume} class="p-3 bg-amber-400 text-gray-900 rounded-full shadow-lg hover:bg-amber-500 transition-colors">
					<Play size={20} />
				</button>
				<button onclick={() => (showIntervene = true)} class="p-3 bg-white text-gray-700 rounded-full shadow-lg border hover:bg-gray-50 transition-colors">
					<MessageSquare size={20} />
				</button>
			{/if}
		</div>
	</div>

	<!-- Mobile drawer -->
	{#if showDrawer}
		<div
			class="lg:hidden fixed inset-0 z-40 flex"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			onclick={(e) => { if (e.target === e.currentTarget) showDrawer = false; }}
			onkeydown={(e) => { if (e.key === 'Escape') showDrawer = false; }}
		>
			<div class="w-72 max-w-[80vw] bg-white shadow-2xl flex flex-col h-full">
				<div class="flex items-center justify-between p-4 border-b border-gray-100">
					<span class="text-sm font-semibold text-gray-700">{$t('discussion_personas')}</span>
					<button onclick={() => (showDrawer = false)} class="p-1 text-gray-400 hover:text-gray-600">
						<X size={18} />
					</button>
				</div>
				<div class="p-4 flex-1 overflow-y-auto space-y-3">
					{#each $currentPersonas as persona (persona.id)}
						<div class="flex items-center gap-2">
							<div
								class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
								style="background-color: {persona.color}"
							>
								{persona.name.charAt(0)}
							</div>
							<div class="min-w-0">
								<p class="text-sm font-medium text-gray-800 truncate">{persona.name}</p>
								<p class="text-xs text-gray-400 truncate">{persona.expertise} · {persona.stance}</p>
							</div>
						</div>
					{/each}
				</div>
				<div class="p-4 border-t border-gray-100 space-y-2">
					<!-- Voice toggle (mobile) -->
					{#if speechSynth}
						<button 
							onclick={toggleVoice} 
							class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg {voiceEnabled ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'text-gray-700 hover:bg-gray-100'}"
						>
							{#if voiceEnabled}
								<Volume2 size={16} /> {$t('discussion_voice_on')}
							{:else}
								<VolumeX size={16} /> {$t('discussion_voice_off')}
							{/if}
						</button>
					{/if}
					
					{#if $sessionStatus === 'running'}
						<button onclick={() => { handlePause(); showDrawer = false; }} class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
							<Pause size={16} /> {$t('discussion_pause')}
						</button>
					{:else if $sessionStatus === 'paused'}
						<button onclick={() => { handleResume(); showDrawer = false; }} class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
							<Play size={16} /> {$t('discussion_resume')}
						</button>
						<button onclick={() => { showDrawer = false; showIntervene = true; }} class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
							<MessageSquare size={16} /> {$t('discussion_intervene')}
						</button>
					{/if}
					{#if $sessionStatus === 'completed'}
						<button onclick={() => goto('/notes')} class="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 rounded-lg">
							<FileText size={16} /> {$t('discussion_generate_notes')}
						</button>
					{/if}
					<button onclick={() => { if ($session) exportJSON($session); }} class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
						<Download size={16} /> {$t('discussion_export')}
					</button>
				</div>
			</div>
			<button class="flex-1 bg-black/30 cursor-default" aria-label="Close" onclick={() => (showDrawer = false)}></button>
		</div>
	{/if}
{/if}

<!-- Intervention modal -->
{#if showIntervene}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) showIntervene = false; }}
		onkeydown={(e) => { if (e.key === 'Escape') showIntervene = false; }}
	>
		<div class="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
			<h2 class="text-lg font-bold mb-4">{$t('intervene_title')}</h2>

			<div class="space-y-2 mb-4">
				<label class="flex items-center gap-2 text-sm">
					<input type="radio" bind:group={interveneType} value="add_topic" class="text-amber-500 accent-amber-500" />
					{$t('intervene_add_topic')}
				</label>
				<label class="flex items-center gap-2 text-sm">
					<input type="radio" bind:group={interveneType} value="change_direction" class="text-amber-500 accent-amber-500" />
					{$t('intervene_change_direction')}
				</label>
				<label class="flex items-center gap-2 text-sm">
					<input type="radio" bind:group={interveneType} value="ask_persona" class="text-amber-500 accent-amber-500" />
					{$t('intervene_ask_persona')}
				</label>
				<label class="flex items-center gap-2 text-sm">
					<input type="radio" bind:group={interveneType} value="summarize" class="text-amber-500 accent-amber-500" />
					{$t('intervene_summarize')}
				</label>
			</div>

			<textarea
				bind:value={interveneText}
				rows={3}
				class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none resize-none text-sm"
				placeholder={$t('intervene_placeholder')}
			></textarea>

			<div class="flex justify-end gap-2 mt-4">
				<button
					onclick={() => (showIntervene = false)}
					class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
				>
					{$t('intervene_cancel')}
				</button>
				<button
					onclick={handleIntervene}
					disabled={!interveneText.trim()}
					class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {interveneText.trim() ? 'bg-amber-400 hover:bg-amber-500 text-gray-900' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}"
				>
					{$t('intervene_send')}
				</button>
			</div>
		</div>
	</div>
{/if}

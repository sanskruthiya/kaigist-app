<script lang="ts">
	import { Rocket, FolderOpen, AlertTriangle } from 'lucide-svelte';
	import { t } from '$lib/i18n';
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/session';
	import { importJSON } from '$lib/utils/export';

	let fileInput: HTMLInputElement | undefined = $state();
	let importError = $state('');

	async function handleImport(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		importError = '';
		try {
			const data = await importJSON(file);
			session.init(data.setup);
			// Restore full state
			for (const u of data.utterances) {
				session.addUtterance(u.speakerPersonaId, u.content, u.round);
			}
			if (data.status) session.setStatus(data.status);
			if (data.currentRound) session.setRound(data.currentRound);
			if (data.meetingNotes) session.setMeetingNotes(data.meetingNotes);
			goto('/discussion');
		} catch (err) {
			importError = err instanceof Error ? err.message : String(err);
		}
		input.value = '';
	}
</script>

<div class="relative flex flex-col items-center justify-center min-h-[calc(100vh-57px)] px-4 bg-amber-50 overflow-hidden">
	<!-- Floating cubes -->
	<div class="cube cube-1"></div>
	<div class="cube cube-2"></div>
	<div class="cube cube-3"></div>
	<div class="cube cube-4"></div>

	<div class="relative z-10 text-center mb-10">
		<img
			src="/images/kAIgistLogo.webp"
			alt="kAIgist"
			class="w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-6 rounded-3xl shadow-xl"
		/>
		<h1 class="mb-3 select-none">
			<span class="text-5xl sm:text-6xl font-light text-gray-700 tracking-tight">k</span><span class="text-5xl sm:text-6xl font-semibold text-amber-500">AI</span><span class="text-5xl sm:text-6xl font-light text-gray-700 tracking-tight">gist</span>
		</h1>
		<p class="text-lg text-gray-500 max-w-sm mx-auto">{$t('app_tagline')}</p>
	</div>

	<div class="relative z-10 flex flex-col gap-4 w-full max-w-sm">
		<a
			href="/setup"
			class="flex items-center justify-center gap-3 px-6 py-4 bg-amber-400 hover:bg-amber-500 text-gray-900 font-medium rounded-xl shadow-lg hover:shadow-xl transition-all"
		>
			<Rocket size={22} />
			{$t('home_new_discussion')}
		</a>

		<button
			onclick={() => fileInput?.click()}
			class="flex items-center justify-center gap-3 px-6 py-4 bg-white/80 backdrop-blur-sm hover:bg-white text-gray-700 font-medium rounded-xl border border-gray-200 shadow-sm hover:shadow transition-all"
		>
			<FolderOpen size={22} />
			<div class="text-left">
				<div>{$t('home_import_discussion')}</div>
				<div class="text-xs text-gray-400 font-normal">{$t('home_import_hint')}</div>
			</div>
		</button>
		<input
			bind:this={fileInput}
			type="file"
			accept=".json"
			class="hidden"
			onchange={handleImport}
		/>

		{#if importError}
			<div class="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
				<AlertTriangle size={14} />
				<span>{importError}</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.cube {
		position: absolute;
		border-radius: 18%;
		opacity: 0.18;
		will-change: transform;
	}

	.cube-1 {
		width: 120px;
		height: 120px;
		background: #f59e0b;
		top: 10%;
		left: 8%;
		animation: spin-slow 18s linear infinite;
	}

	.cube-2 {
		width: 90px;
		height: 90px;
		background: #ef4444;
		top: 18%;
		right: 10%;
		animation: spin-slow 24s linear infinite reverse;
	}

	.cube-3 {
		width: 100px;
		height: 100px;
		background: #3b82f6;
		bottom: 14%;
		left: 12%;
		animation: spin-slow 20s linear infinite;
	}

	.cube-4 {
		width: 80px;
		height: 80px;
		background: #10b981;
		bottom: 20%;
		right: 8%;
		animation: spin-slow 22s linear infinite reverse;
	}

	@keyframes spin-slow {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>

<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowLeft, Download, Copy, Loader2, CheckCircle, AlertTriangle } from 'lucide-svelte';
	import { t, locale } from '$lib/i18n';
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/session';
	import { sendMessage } from '$lib/llm';
	import { buildMeetingNotesPrompt } from '$lib/prompts/meeting-notes';
	import { exportJSON, exportMarkdown, copyToClipboard } from '$lib/utils/export';

	let notes = $state('');
	let isGenerating = $state(false);
	let errorMsg = $state('');
	let copied = $state(false);

	async function generateNotes() {
		const s = $session;
		if (!s) return;

		if (s.meetingNotes) {
			notes = s.meetingNotes;
			return;
		}

		isGenerating = true;
		errorMsg = '';
		notes = '';

		const prompt = buildMeetingNotesPrompt({
			theme: s.setup.theme,
			personas: s.setup.personas,
			utterances: s.utterances,
			locale: $locale
		});

		try {
			await sendMessage(
				s.setup.modelId,
				{ messages: [{ role: 'user', content: prompt }], maxTokens: 4096, temperature: 0.5 },
				{
					onToken: (token) => { notes += token; },
					onComplete: () => { session.setMeetingNotes(notes); },
					onError: (err) => { throw err; }
				}
			);
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : String(err);
		} finally {
			isGenerating = false;
		}
	}

	async function handleCopy() {
		const ok = await copyToClipboard(notes);
		if (ok) {
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}

	function handleExportMd() {
		if (!$session) return;
		exportMarkdown($session, notes);
	}

	function handleExportJson() {
		if (!$session) return;
		exportJSON($session);
	}

	onMount(() => {
		session.load();
		if (!$session) {
			goto('/setup');
			return;
		}
		generateNotes();
	});
</script>

{#if !$session}
	<div class="flex items-center justify-center h-[calc(100vh-57px)]">
		<p class="text-gray-500">{$t('discussion_no_session')}</p>
	</div>
{:else}
	<div class="max-w-3xl mx-auto px-4 py-8">
		<!-- Header -->
		<div class="flex items-center justify-between mb-6 sm:mb-8 gap-2">
			<a
				href="/discussion"
				class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors shrink-0"
			>
				<ArrowLeft size={16} />
				<span class="hidden sm:inline">{$t('notes_back')}</span>
			</a>
			{#if notes && !isGenerating}
				<div class="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
					<button
						onclick={handleCopy}
						class="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border transition-colors {copied ? 'text-green-600 border-green-300 bg-green-50' : 'text-gray-600 hover:bg-gray-100'}"
					>
						{#if copied}
							<CheckCircle size={14} />
						{:else}
							<Copy size={14} />
						{/if}
						{$t('notes_copy')}
					</button>
					<button
						onclick={handleExportMd}
						class="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg border transition-colors"
					>
						<Download size={14} />
						{$t('notes_export_md')}
					</button>
					<button
						onclick={handleExportJson}
						class="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg border transition-colors"
					>
						<Download size={14} />
						{$t('notes_export_json')}
					</button>
				</div>
			{/if}
		</div>

		<!-- Content -->
		<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-8">
			{#if isGenerating && !notes}
				<div class="flex flex-col items-center justify-center py-16 text-gray-500">
					<Loader2 size={32} class="animate-spin mb-4" />
					<p class="text-sm">{$t('notes_title')}...</p>
				</div>
			{:else if errorMsg}
				<div class="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
					<AlertTriangle size={16} />
					<span>{errorMsg}</span>
				</div>
				<button
					onclick={generateNotes}
					class="px-4 py-2 text-sm bg-amber-400 hover:bg-amber-500 text-gray-900 rounded-lg transition-colors"
				>
					{$t('btn_retry')}
				</button>
			{:else}
				<div class="prose prose-sm max-w-none">
					{@html renderMarkdown(notes)}
				</div>
				{#if isGenerating}
					<div class="flex items-center gap-2 text-gray-400 mt-4">
						<Loader2 size={14} class="animate-spin" />
						<span class="text-xs">{$t('status_round_progress')}...</span>
					</div>
				{/if}
			{/if}
		</div>
	</div>
{/if}

<script lang="ts" module>
	function renderMarkdown(md: string): string {
		if (!md) return '';
		return md
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/^### (.+)$/gm, '<h3>$1</h3>')
			.replace(/^## (.+)$/gm, '<h2>$1</h2>')
			.replace(/^# (.+)$/gm, '<h1>$1</h1>')
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/^\- (.+)$/gm, '<li>$1</li>')
			.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
			.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
			.replace(/^---$/gm, '<hr />')
			.replace(/\n{2,}/g, '</p><p>')
			.replace(/^(?!<[hulo]|<li|<hr)(.+)$/gm, '<p>$1</p>')
			.replace(/<p><\/p>/g, '');
	}
</script>

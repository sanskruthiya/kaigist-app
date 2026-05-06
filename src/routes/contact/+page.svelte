<script lang="ts">
	import { Send, CheckCircle, AlertTriangle } from 'lucide-svelte';
	import { t } from '$lib/i18n';

	let name = $state('');
	let email = $state('');
	let message = $state('');
	let status = $state<'idle' | 'sending' | 'success' | 'error'>('idle');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		
		if (!name.trim() || !email.trim() || !message.trim()) {
			return;
		}

		status = 'sending';

		try {
			const response = await fetch('https://formspree.io/f/mpwjnvdr', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: name.trim(),
					email: email.trim(),
					message: message.trim(),
				}),
			});

			if (response.ok) {
				status = 'success';
				name = '';
				email = '';
				message = '';
				setTimeout(() => {
					status = 'idle';
				}, 5000);
			} else {
				status = 'error';
				setTimeout(() => {
					status = 'idle';
				}, 5000);
			}
		} catch {
			status = 'error';
			setTimeout(() => {
				status = 'idle';
			}, 5000);
		}
	}

	const isFormValid = $derived(name.trim() && email.trim() && message.trim());
</script>

<div class="min-h-[calc(100vh-57px)] bg-gradient-to-b from-amber-50 to-white">
	<div class="max-w-2xl mx-auto px-4 py-12 sm:py-16">
		<!-- Header -->
		<div class="text-center mb-12">
			<h1 class="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
				{$t('contact_title')}
			</h1>
			<p class="text-lg text-gray-600 leading-relaxed">
				{$t('contact_description')}
			</p>
		</div>

		<!-- Contact Form -->
		<form onsubmit={handleSubmit} class="bg-white rounded-xl shadow-lg border border-gray-100 p-6 sm:p-8">
			<div class="space-y-6">
				<!-- Name -->
				<div>
					<label for="name" class="block text-sm font-medium text-gray-700 mb-2">
						{$t('contact_name_label')}
					</label>
					<input
						id="name"
						type="text"
						bind:value={name}
						placeholder={$t('contact_name_placeholder')}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all"
						required
					/>
				</div>

				<!-- Email -->
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700 mb-2">
						{$t('contact_email_label')}
					</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						placeholder={$t('contact_email_placeholder')}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all"
						required
					/>
				</div>

				<!-- Message -->
				<div>
					<label for="message" class="block text-sm font-medium text-gray-700 mb-2">
						{$t('contact_message_label')}
					</label>
					<textarea
						id="message"
						bind:value={message}
						rows={6}
						placeholder={$t('contact_message_placeholder')}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none resize-none transition-all"
						required
					></textarea>
				</div>

				<!-- Submit Button -->
				<button
					type="submit"
					disabled={!isFormValid || status === 'sending'}
					class="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all {
						isFormValid && status !== 'sending'
							? 'bg-amber-400 hover:bg-amber-500 text-gray-900 shadow-lg hover:shadow-xl'
							: 'bg-gray-200 text-gray-400 cursor-not-allowed'
					}"
				>
					{#if status === 'sending'}
						<div class="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
						{$t('contact_sending')}
					{:else}
						<Send size={20} />
						{$t('contact_send')}
					{/if}
				</button>

				<!-- Status Messages -->
				{#if status === 'success'}
					<div class="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
						<CheckCircle size={18} />
						<span>{$t('contact_success')}</span>
					</div>
				{/if}

				{#if status === 'error'}
					<div class="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
						<AlertTriangle size={18} />
						<span>{$t('contact_error')}</span>
					</div>
				{/if}
			</div>
		</form>
	</div>
</div>

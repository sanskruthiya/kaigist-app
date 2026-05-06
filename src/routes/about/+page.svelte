<script lang="ts">
	import { ExternalLink, Sparkles, Users, MessageSquare, FileText } from 'lucide-svelte';
	import { t } from '$lib/i18n';
</script>

<div class="min-h-[calc(100vh-57px)] bg-gradient-to-b from-amber-50 to-white">
	<div class="max-w-4xl mx-auto px-4 py-12 sm:py-16">
		<!-- Header -->
		<div class="text-center mb-12">
			<img
				src="/images/kAIgistLogo.webp"
				alt="kAIgist"
				class="w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-6 rounded-3xl shadow-xl"
			/>
			<h1 class="mb-3 select-none">
				<span class="text-5xl sm:text-6xl font-light text-gray-700 tracking-tight">k</span><span class="text-5xl sm:text-6xl font-semibold text-amber-500">AI</span><span class="text-5xl sm:text-6xl font-light text-gray-700 tracking-tight">gist</span>
			</h1>
			<p class="text-lg text-gray-500 mb-8">{$t('app_tagline')}</p>
		</div>
		
		<!-- Description -->
		<div class="mb-12">
			<h2 class="text-2xl font-bold text-gray-900 mb-4">
				{$t('about_title')}
			</h2>
			<p class="text-lg text-gray-600 leading-relaxed mb-3">
				{$t('about_description')}
			</p>
			<p class="text-sm text-gray-500 italic">
				{$t('about_name_origin')}
			</p>
		</div>

		<!-- Features -->
		<div class="mb-12">
			<h2 class="text-2xl font-bold text-gray-900 mb-6">
				{$t('about_features_title')}
			</h2>
			<div class="grid sm:grid-cols-2 gap-6">
				<div class="flex items-start gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
					<div class="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
						<Sparkles class="text-amber-600" size={24} />
					</div>
					<div>
						<h3 class="font-semibold text-gray-900 mb-1">{$t('about_feature_1')}</h3>
					</div>
				</div>

				<div class="flex items-start gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
					<div class="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
						<Users class="text-blue-600" size={24} />
					</div>
					<div>
						<h3 class="font-semibold text-gray-900 mb-1">{$t('about_feature_2')}</h3>
					</div>
				</div>

				<div class="flex items-start gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
					<div class="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
						<MessageSquare class="text-green-600" size={24} />
					</div>
					<div>
						<h3 class="font-semibold text-gray-900 mb-1">{$t('about_feature_3')}</h3>
					</div>
				</div>

				<div class="flex items-start gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
					<div class="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
						<FileText class="text-purple-600" size={24} />
					</div>
					<div>
						<h3 class="font-semibold text-gray-900 mb-1">{$t('about_feature_4')}</h3>
					</div>
				</div>
			</div>
		</div>

		<!-- GitHub Link -->
		<div class="text-center">
			<p class="text-sm text-gray-600">
				<a
					href="https://github.com/sanskruthiya/kaigist-app"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 underline transition-colors"
				>
					View code on GitHub
					<ExternalLink size={14} />
				</a>
			</p>
		</div>
	</div>
</div>

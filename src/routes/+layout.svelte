<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/Header.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>Kaigist — AI議論シミュレーター</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex flex-col">
	<Header />
	<main class="flex-1">
		{@render children()}
	</main>
</div>

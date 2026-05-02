<script lang="ts">
	import { onMount } from 'svelte';

	let { text = '', speed = 30 }: { text: string; speed?: number } = $props();

	let displayedText = $state('');
	let currentIndex = $state(0);

	onMount(() => {
		if (!text) return;

		const interval = setInterval(() => {
			if (currentIndex < text.length) {
				displayedText = text.slice(0, currentIndex + 1);
				currentIndex++;
			} else {
				clearInterval(interval);
			}
		}, speed);

		return () => clearInterval(interval);
	});
</script>

{displayedText}

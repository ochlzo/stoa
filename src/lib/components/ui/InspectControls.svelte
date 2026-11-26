<script lang="ts">
	import {
		getInspectPhase,
		getInspectedVolume,
		getSceneMode,
		openReadingMode,
		requestReturnToShelf
	} from '#lib/state/library.svelte.ts';

	const volume = $derived(getInspectedVolume());
	const phase = $derived(getInspectPhase());
	const isVisible = $derived(
		getSceneMode() === 'inspect' && volume !== null && phase !== 'returning'
	);

	// Allow pressing Escape anywhere to smoothly return the Volume to its Shelf slot.
	$effect(() => {
		if (getSceneMode() !== 'inspect') return;

		function onKeyDown(event: KeyboardEvent): void {
			if (event.key === 'Escape') {
				event.preventDefault();
				requestReturnToShelf();
			}
		}

		window.addEventListener('keydown', onKeyDown);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
		};
	});

	function handleOpenToRead(): void {
		openReadingMode();
	}
</script>

{#if volume && getSceneMode() === 'inspect'}
	<div
		data-testid="inspect-controls"
		data-volume-id={volume.id}
		data-inspect-phase={phase}
		inert={!isVisible}
		class="study-controls {isVisible
			? 'opacity-100'
			: 'opacity-0'}"
	>
		<header class="study-heading">
			<h1 class="font-volume text-3xl leading-tight sm:text-4xl">{volume.title}</h1>
			<p class="mt-1 text-sm">{volume.author}</p>
		</header>

		<div class="flex w-full items-center justify-between">
			<button type="button" onclick={requestReturnToShelf} class="volume-action">
				Return to Shelf
			</button>
			<button type="button" onclick={handleOpenToRead} class="volume-action underline decoration-brass">
				Open to Read <span aria-hidden="true">→</span>
			</button>
		</div>
	</div>
{/if}

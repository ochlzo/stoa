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

	let readingPendingNotice = $state(false);

	// Reset the Reading Mode notice whenever Inspect Mode opens or closes.
	$effect(() => {
		if (!isVisible) {
			readingPendingNotice = false;
		}
	});

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
		const opened = openReadingMode();
		if (!opened) {
			readingPendingNotice = true;
		}
	}
</script>

{#if volume}
	<div
		data-testid="inspect-controls"
		data-volume-id={volume.id}
		data-inspect-phase={phase}
		class="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-between px-4 py-6 transition-opacity duration-200 sm:py-8 {isVisible
			? 'opacity-100'
			: 'opacity-0'}"
	>
		<!-- Subtle editorial header for the inspected Volume -->
		<header class="flex flex-col items-center gap-1 text-center">
			<h1 class="text-sm font-medium tracking-wide text-stone-100 drop-shadow-xs sm:text-base">
				{volume.title}
			</h1>
			<p class="text-[11px] tracking-[0.14em] text-stone-300/90 uppercase">
				{volume.author}
			</p>
			<p class="mt-0.5 text-[11px] text-stone-400/90">Drag to inspect</p>
		</header>

		<!-- Floating action controls -->
		<div class="flex flex-col items-center gap-2">
			{#if readingPendingNotice}
				<p
					role="status"
					class="rounded-full border border-stone-600/60 bg-stone-900/90 px-3 py-1 text-[11px] tracking-wide text-stone-200 shadow-sm backdrop-blur-xs"
				>
					Reading Mode arrives in the next milestone
				</p>
			{/if}

			<div
				class="pointer-events-auto flex items-center gap-2 rounded-full border border-stone-600/50 bg-stone-900/85 p-1.5 shadow-lg backdrop-blur-md"
			>
				<button
					type="button"
					onclick={handleOpenToRead}
					class="cursor-pointer rounded-full bg-stone-100 px-4 py-2 text-xs font-medium tracking-wide text-stone-900 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-200"
				>
					Open to Read
				</button>
				<button
					type="button"
					onclick={requestReturnToShelf}
					class="cursor-pointer rounded-full px-4 py-2 text-xs font-medium tracking-wide text-stone-200 transition-colors hover:bg-stone-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400"
				>
					Return to Shelf
				</button>
			</div>
		</div>
	</div>
{/if}

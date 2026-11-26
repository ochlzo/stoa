<script lang="ts">
	import { getSpread, getVolumeReadingModel } from '#lib/catalog/reading.ts';
	import { READING_VOLUME_CONFIG } from '#lib/physics/reading-volume.ts';
	import {
		getCurrentSpreadIndex,
		getFocusedPageSide,
		getInspectedVolume,
		getReadingPhase,
		getSceneMode,
		requestCloseToInspect,
		requestReturnToShelfFromReading,
		setFocusedPageSide,
		stepReadingSpread
	} from '#lib/state/library.svelte.ts';

	const volume = $derived(getInspectedVolume());
	const sceneMode = $derived(getSceneMode());
	const phase = $derived(getReadingPhase());
	const spreadIndex = $derived(getCurrentSpreadIndex());
	const focusedSide = $derived(getFocusedPageSide());

	const isReading = $derived(sceneMode === 'reading' && volume !== null);
	const isVisible = $derived(
		isReading && phase !== 'closing-to-inspect' && phase !== 'closing-to-shelf'
	);

	const model = $derived(volume ? getVolumeReadingModel(volume) : null);
	const spread = $derived(model ? getSpread(model, spreadIndex) : null);
	const totalSpreads = $derived(model ? model.spreads.length : 1);
	const canPrev = $derived(spreadIndex > 0);
	const canNext = $derived(spreadIndex < totalSpreads - 1);

	let isMobilePortrait = $state(false);

	// Track narrow portrait viewports so mobile single-Page focus controls appear cleanly (ADR 0004).
	$effect(() => {
		function updateViewport(): void {
			const aspect = window.innerWidth / Math.max(1, window.innerHeight);
			isMobilePortrait = aspect < READING_VOLUME_CONFIG.mobilePortraitAspectThreshold;
		}
		updateViewport();
		window.addEventListener('resize', updateViewport);
		return () => {
			window.removeEventListener('resize', updateViewport);
		};
	});

	// Keyboard shortcuts while in Reading Mode: Escape folds to Inspect, Left/Right step Spreads.
	$effect(() => {
		if (!isReading) return;

		function onKeyDown(event: KeyboardEvent): void {
			if (event.key === 'Escape') {
				event.preventDefault();
				requestCloseToInspect();
			} else if (event.key === 'ArrowLeft') {
				event.preventDefault();
				stepReadingSpread(-1);
			} else if (event.key === 'ArrowRight') {
				event.preventDefault();
				stepReadingSpread(1);
			}
		}

		window.addEventListener('keydown', onKeyDown);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
		};
	});

	const spreadLabel = $derived.by(() => {
		if (!spread) return '';
		if (spread.index === 0) return 'Title Spread';
		const leftNum = spread.leftPage.pageNumber;
		const rightNum = spread.rightPage.pageNumber;
		if (leftNum !== null && rightNum !== null) {
			return `pp. ${leftNum}–${rightNum}`;
		}
		if (leftNum !== null) return `p. ${leftNum}`;
		if (rightNum !== null) return `p. ${rightNum}`;
		return 'Colophon';
	});

	const chapterLabel = $derived.by(() => {
		if (!model || !spread || spread.chapterIndex === null) return null;
		const ch = model.chapters[spread.chapterIndex];
		return ch ? `Chapter ${ch.romanNumeral} — ${ch.title}` : null;
	});
</script>

{#if isReading && volume}
	<div
		data-testid="reading-controls"
		data-volume-id={volume.id}
		data-reading-phase={phase}
		data-spread-index={spreadIndex}
		data-focused-side={focusedSide}
		class="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-between px-4 py-5 transition-opacity duration-200 sm:py-7 {isVisible
			? 'opacity-100'
			: 'opacity-0'}"
	>
		<!-- Top reading status header -->
		<header class="flex flex-col items-center gap-0.5 text-center">
			<h1 class="text-sm font-medium tracking-wide text-stone-100 drop-shadow-xs sm:text-base">
				{volume.title}
			</h1>
			<p class="text-[11px] tracking-[0.12em] text-stone-300/90 uppercase">
				{#if chapterLabel}
					{chapterLabel} · {spreadLabel}
				{:else}
					{volume.author} · {spreadLabel}
				{/if}
			</p>
		</header>

		<!-- Bottom floating Reading Mode action bar -->
		<div class="flex flex-col items-center gap-2">
			{#if isMobilePortrait}
				<!-- Mobile single-Page focus switcher (ADR 0004) -->
				<div
					class="pointer-events-auto flex items-center gap-1 rounded-full border border-stone-600/50 bg-stone-900/85 p-1 text-[11px] shadow-md backdrop-blur-md"
				>
					<button
						type="button"
						onclick={() => setFocusedPageSide('left')}
						class="cursor-pointer rounded-full px-3 py-1 font-medium transition-colors {focusedSide ===
						'left'
							? 'bg-stone-100 text-stone-900'
							: 'text-stone-300 hover:text-white'}"
					>
						Left Page
					</button>
					<button
						type="button"
						onclick={() => setFocusedPageSide('right')}
						class="cursor-pointer rounded-full px-3 py-1 font-medium transition-colors {focusedSide ===
						'right'
							? 'bg-stone-100 text-stone-900'
							: 'text-stone-300 hover:text-white'}"
					>
						Right Page
					</button>
				</div>
			{/if}

			<div
				class="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-stone-600/50 bg-stone-900/85 p-1.5 shadow-lg backdrop-blur-md"
			>
				<button
					type="button"
					disabled={!canPrev}
					onclick={() => stepReadingSpread(-1)}
					aria-label="Previous Spread"
					class="cursor-pointer rounded-full px-3 py-2 text-xs font-medium text-stone-200 transition-colors hover:bg-stone-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
				>
					← Prev
				</button>
				<button
					type="button"
					disabled={!canNext}
					onclick={() => stepReadingSpread(1)}
					aria-label="Next Spread"
					class="cursor-pointer rounded-full px-3 py-2 text-xs font-medium text-stone-200 transition-colors hover:bg-stone-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
				>
					Next →
				</button>
				<span class="mx-0.5 h-4 w-px bg-stone-700/80" aria-hidden="true"></span>
				<button
					type="button"
					onclick={requestCloseToInspect}
					class="cursor-pointer rounded-full bg-stone-100 px-4 py-2 text-xs font-medium tracking-wide text-stone-900 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-200"
				>
					Close
				</button>
				<button
					type="button"
					onclick={requestReturnToShelfFromReading}
					class="cursor-pointer rounded-full px-4 py-2 text-xs font-medium tracking-wide text-stone-200 transition-colors hover:bg-stone-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400"
				>
					Return to Shelf
				</button>
			</div>
		</div>
	</div>
{/if}

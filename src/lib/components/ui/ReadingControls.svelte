<script lang="ts">
	import { tick } from 'svelte';
	import { getSpread, getVolumeReadingModel } from '#lib/catalog/reading.ts';
	import { READING_VOLUME_CONFIG } from '#lib/physics/reading-volume.ts';
	import {
		getCurrentSpreadIndex,
		getFocusedPageSide,
		getInspectedVolume,
		getLeafTurn,
		getReadingPhase,
		getSceneMode,
		jumpToReadingPage,
		readingHud,
		requestCloseToInspect,
		requestReturnToShelfFromReading,
		setFocusedPageSide,
		startLeafTurn
	} from '#lib/state/library.svelte.ts';

	const HUD_FADE_DELAY_MS = 3200;
	const HUD_HOVER_REVEAL_DISTANCE_PX = 48;
	const HUD_EDGE_REVEAL_BAND_PX = 96;

	const volume = $derived(getInspectedVolume());
	const sceneMode = $derived(getSceneMode());
	const phase = $derived(getReadingPhase());
	const spreadIndex = $derived(getCurrentSpreadIndex());
	const focusedSide = $derived(getFocusedPageSide());

	const isReading = $derived(sceneMode === 'reading' && volume !== null);
	let drawerOpen = $state(false);
	const isVisible = $derived(phase === 'reading' && (readingHud.visible || drawerOpen));

	const model = $derived(volume ? getVolumeReadingModel(volume) : null);
	const spread = $derived(model ? getSpread(model, spreadIndex) : null);
	const activeMobilePage = $derived(
		spread ? (focusedSide === 'left' ? spread.leftPage : spread.rightPage) : null
	);
	const totalSpreads = $derived(model ? model.spreads.length : 1);
	const canPrev = $derived(spreadIndex > 0);
	const canNext = $derived(spreadIndex < totalSpreads - 1);

	let isMobilePortrait = $state(false);
	let indicator = $state<HTMLButtonElement>();
	let controls = $state<HTMLDivElement>();
	let timer: ReturnType<typeof setTimeout>;

	function scheduleFade() {
		clearTimeout(timer);
		timer = setTimeout(() => {
			if (!drawerOpen && !controls?.querySelector(':focus-visible')) {
				readingHud.visible = false;
				readingHud.dismissPoint = null;
			}
		}, HUD_FADE_DELAY_MS);
	}

	function reveal() {
		readingHud.visible = true;
		readingHud.dismissPoint = null;
		scheduleFade();
	}

	$effect(() => {
		if (phase !== 'reading') {
			drawerOpen = false;
			return;
		}
		if (readingHud.visible && !drawerOpen) scheduleFade();
		return () => clearTimeout(timer);
	});

	function onHover(event: PointerEvent) {
		if (phase !== 'reading' || event.pointerType !== 'mouse' || event.buttons !== 0) return;
		const dismiss = readingHud.dismissPoint;
		if (dismiss && !readingHud.visible) {
			const movedFarEnough =
				Math.hypot(event.clientX - dismiss.x, event.clientY - dismiss.y) >=
				HUD_HOVER_REVEAL_DISTANCE_PX;
			const nearChromeEdge =
				event.clientY <= HUD_EDGE_REVEAL_BAND_PX ||
				event.clientY >= window.innerHeight - HUD_EDGE_REVEAL_BAND_PX;
			if (!movedFarEnough && !nearChromeEdge) return;
		}
		reveal();
	}

	async function closeDrawer() {
		drawerOpen = false;
		await tick();
		indicator?.focus({ preventScroll: true });
		reveal();
	}

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
			if (phase !== 'reading') return;
			if (event.key === 'Tab') reveal();
			if (drawerOpen) {
				if (event.key === 'Escape') {
					event.preventDefault();
					void closeDrawer();
				}
				return;
			}
			if (event.key === 'Escape') {
				event.preventDefault();
				requestCloseToInspect();
			} else if (event.key === 'ArrowLeft') {
				event.preventDefault();
				startLeafTurn(-1);
			} else if (event.key === 'ArrowRight') {
				event.preventDefault();
				startLeafTurn(1);
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
		if (isMobilePortrait && activeMobilePage?.pageNumber !== null && activeMobilePage) {
			return `p. ${activeMobilePage.pageNumber}`;
		}
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
		const index = isMobilePortrait ? (activeMobilePage?.chapterIndex ?? null) : spread.chapterIndex;
		const ch = index === null ? null : model.chapters[index];
		return ch ? `Chapter ${ch.romanNumeral} — ${ch.title}` : null;
	});
</script>

<svelte:window onpointermove={onHover} />

{#if isReading && volume}
	<div
		bind:this={controls}
		inert={!isVisible}
		onfocusin={reveal}
		onfocusout={scheduleFade}
		data-testid="reading-controls"
		data-volume-id={volume.id}
		data-reading-phase={phase}
		data-spread-index={spreadIndex}
		data-focused-side={focusedSide}
		class="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-between px-4 py-5 transition-opacity duration-200 sm:py-7 {isVisible
			? 'opacity-100'
			: 'opacity-0'}"
	>
		{#if drawerOpen}
			<!-- Absorbs outside taps so dismissing the Chapter drawer never leaks to the 3D Spread -->
			<div
				aria-hidden="true"
				class="pointer-events-auto fixed inset-0 z-0"
				onpointerdown={(event) => {
					event.stopPropagation();
					void closeDrawer();
				}}
				onclick={(event) => event.stopPropagation()}
			></div>
		{/if}

		<!-- Top reading status header -->
		<header class="relative z-10 flex flex-col items-center gap-0.5 text-center">
			<h1 class="text-sm font-medium tracking-wide text-stone-100 drop-shadow-xs sm:text-base">
				{volume.title}
			</h1>
			<div data-chapters class="pointer-events-auto relative text-center">
				<button
					type="button"
					bind:this={indicator}
					disabled={!!getLeafTurn()}
					aria-label={`Choose Chapter, ${chapterLabel ?? volume.author}, ${spreadLabel}`}
					aria-expanded={drawerOpen}
					aria-controls="chapter-drawer"
					onclick={() => {
						drawerOpen = !drawerOpen;
						reveal();
					}}
					class="cursor-pointer rounded-full bg-stone-900/80 px-3 py-1.5 text-[11px] tracking-wide text-stone-200 hover:bg-stone-800"
				>
					{#if chapterLabel}
						{chapterLabel} · {spreadLabel}
					{:else}
						{volume.author} · {spreadLabel}
					{/if}
					<span aria-hidden="true"> ▾</span>
				</button>
				{#if drawerOpen && model}
					<nav
						id="chapter-drawer"
						aria-label="Chapters"
						class="absolute top-full left-1/2 z-10 mt-2 max-h-[50dvh] w-72 max-w-[92vw] -translate-x-1/2 overflow-y-auto overscroll-contain rounded-xl border border-stone-600 bg-stone-900 p-1.5 text-left shadow-lg"
					>
						{#each model.chapters as chapter (chapter.index)}
							<button
								type="button"
								aria-current={chapter.index === spread?.chapterIndex ? 'location' : undefined}
								onclick={() => {
									jumpToReadingPage(chapter.startPageIndex);
									void closeDrawer();
								}}
								class="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-stone-200 hover:bg-stone-700 aria-current:bg-stone-800"
							>
								{chapter.romanNumeral} · {chapter.title}
							</button>
						{/each}
					</nav>
				{/if}
			</div>
		</header>

		<!-- Bottom floating Reading Mode action bar -->
		<div class="relative z-10 flex flex-col items-center gap-2">
			{#if isMobilePortrait}
				<!-- Mobile single-Page focus switcher (ADR 0004) -->
				<div
					class="pointer-events-auto flex items-center gap-1 rounded-full border border-stone-600/50 bg-stone-900/85 p-1 text-[11px] shadow-md backdrop-blur-md"
				>
					<button
						type="button"
						disabled={!!getLeafTurn() || phase !== 'reading'}
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
						disabled={!!getLeafTurn() || phase !== 'reading'}
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
					disabled={!!getLeafTurn() || phase !== 'reading' || !canPrev}
					onclick={() => startLeafTurn(-1)}
					aria-label="Previous Spread"
					class="cursor-pointer rounded-full px-3 py-2 text-xs font-medium text-stone-200 transition-colors hover:bg-stone-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
				>
					← <span class="hidden sm:inline">Prev</span>
				</button>
				<button
					type="button"
					disabled={!!getLeafTurn() || phase !== 'reading' || !canNext}
					onclick={() => startLeafTurn(1)}
					aria-label="Next Spread"
					class="cursor-pointer rounded-full px-3 py-2 text-xs font-medium text-stone-200 transition-colors hover:bg-stone-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
				>
					<span class="hidden sm:inline">Next </span>→
				</button>
				<span class="mx-0.5 h-4 w-px bg-stone-700/80" aria-hidden="true"></span>
				<button
					type="button"
					onclick={requestCloseToInspect}
					class="cursor-pointer rounded-full bg-stone-100 px-2.5 py-2 text-xs font-medium tracking-wide text-stone-900 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-200 sm:px-4"
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

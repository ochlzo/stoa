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

	const pageSides = ['left', 'right'] as const;
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
	const lastPageNumber = $derived(
		model ? model.pages.reduce((last, page) => Math.max(last, page.pageNumber ?? 0), 0) : 0
	);
	const canPrev = $derived(spreadIndex > 0);
	const canNext = $derived(spreadIndex < totalSpreads - 1);

	let isMobilePortrait = $state(false);
	let pageNumberInput = $state('');
	let pageInput = $state<HTMLInputElement>();
	let indicator = $state<HTMLButtonElement>();
	let controls = $state<HTMLDivElement>();
	let timer: ReturnType<typeof setTimeout>;

	function scheduleFade() {
		clearTimeout(timer);
		timer = setTimeout(() => {
			if (!drawerOpen && !controls?.contains(document.activeElement)) {
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

	function goToPage(event: SubmitEvent) {
		event.preventDefault();
		if (!model || getLeafTurn() || phase !== 'reading') return;
		const value = pageNumberInput.trim();
		const number = Number(value);
		const page = /^\d+$/.test(value)
			? model.pages.find((candidate) => candidate.pageNumber === number)
			: undefined;
		if (!page) {
			pageInput?.setCustomValidity(`Enter a Page number from 1 to ${lastPageNumber}.`);
			pageInput?.reportValidity();
			return;
		}
		pageInput?.setCustomValidity('');
		jumpToReadingPage(page.index);
		pageNumberInput = '';
		pageInput?.blur();
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
			if (event.target instanceof HTMLInputElement) return;
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
		class="study-controls {isVisible
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
		<header class="study-heading relative z-10 max-w-full">
			<h1 class="font-volume text-2xl leading-tight">
				{volume.title}
			</h1>
			<div data-chapters class="pointer-events-auto relative mt-1 max-w-full">
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
					class="study-action border-b border-brass/60 bg-ink/95 text-left enabled:hover:bg-ink"
				>
					{#if chapterLabel}
						{chapterLabel}, {spreadLabel}
					{:else}
						{volume.author}, {spreadLabel}
					{/if}
					<span aria-hidden="true"> ▾</span>
				</button>
				{#if lastPageNumber > 0}
					<form onsubmit={goToPage} novalidate class="mt-2 flex w-fit items-center bg-ink/95 text-paper">
						<label for="reading-page-number" class="sr-only">Page number</label>
						<input
							id="reading-page-number"
							bind:this={pageInput}
							bind:value={pageNumberInput}
							type="text"
							inputmode="numeric"
							autocomplete="off"
							placeholder="Page"
							disabled={!!getLeafTurn() || phase !== 'reading'}
							oninput={() => pageInput?.setCustomValidity('')}
							class="h-11 w-14 px-1 text-center text-sm text-paper placeholder:text-paper/75 focus-visible:outline-2 focus-visible:outline-brass disabled:opacity-40"
						/>
						<button
							type="submit"
							disabled={!!getLeafTurn() || phase !== 'reading'}
							class="study-action border-b border-brass/60 px-2 enabled:hover:bg-paper/15"
						>
							Go
						</button>
					</form>
				{/if}
				{#if drawerOpen && model}
					<nav
						id="chapter-drawer"
						aria-label="Title Spread and Chapters"
						class="absolute top-full left-0 z-10 mt-1 max-h-[50dvh] w-80 max-w-[calc(100vw-3.5rem)] overflow-y-auto overscroll-contain border-t-2 border-brass bg-paper p-2 text-left text-ink shadow-lg"
					>
						<button
							type="button"
							aria-current={spreadIndex === 0 ? 'location' : undefined}
							onclick={() => {
								jumpToReadingPage(model.spreads[0].rightPage.index);
								void closeDrawer();
							}}
							class="chapter-choice"
						>
							<svg aria-hidden="true" viewBox="0 0 36 36" class="h-6 w-6 text-muted">
								<path d="M18 4v19M18 5l7 2-7 2" fill="none" stroke="currentColor" stroke-width="1.5" />
								<path d="M16 8 8 22h8V8Zm4 3v11h8L20 11ZM4 24c3 5 8 7 14 7s11-2 14-7H4Z" fill="currentColor" />
								<path d="M3 33c4-2 7-2 11 0s7 2 11 0 7-2 10 0" fill="none" stroke="currentColor" stroke-width="1.5" />
							</svg>
							<span class="font-volume text-base">Homer, Title Spread</span>
						</button>
						{#each model.chapters as chapter (chapter.index)}
							<button
								type="button"
								aria-current={chapter.index === spread?.chapterIndex ? 'location' : undefined}
								onclick={() => {
									jumpToReadingPage(chapter.startPageIndex);
									void closeDrawer();
								}}
								class="chapter-choice"
							>
								<span class="text-xs text-muted">{chapter.romanNumeral}</span>
								<span class="font-volume text-base">{chapter.title}</span>
							</button>
						{/each}
					</nav>
				{/if}
			</div>
		</header>

		<!-- Bottom floating Reading Mode action bar -->
		<div class="relative z-10 flex w-full flex-col items-center">
			{#if isMobilePortrait}
				<!-- Mobile single-Page focus switcher (ADR 0004) -->
				<div class="flex gap-4">
					{#each pageSides as side}
						<button
							type="button"
							disabled={!!getLeafTurn() || phase !== 'reading'}
							aria-pressed={focusedSide === side}
							onclick={() => setFocusedPageSide(side)}
							class="volume-action"
						>
							{side === 'left' ? 'Left Page' : 'Right Page'}
						</button>
					{/each}
				</div>
			{/if}

			<div class="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-0">
				<div class="flex items-center gap-1 sm:gap-4">
					<button
						type="button"
						disabled={!!getLeafTurn() || phase !== 'reading' || !canPrev}
						onclick={() => startLeafTurn(-1)}
						aria-label="Previous Spread"
						class="volume-action"
					>
						Previous
					</button>
					<button
						type="button"
						disabled={!!getLeafTurn() || phase !== 'reading' || !canNext}
						onclick={() => startLeafTurn(1)}
						aria-label="Next Spread"
						class="volume-action"
					>
						Next
					</button>
				</div>
				<div class="flex items-center gap-1 sm:gap-4">
					<button
						type="button"
						onclick={requestCloseToInspect}
						class="volume-action"
					>
						Close
					</button>
					<button
						type="button"
						onclick={requestReturnToShelfFromReading}
						class="volume-action"
					>
						Return to Shelf
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

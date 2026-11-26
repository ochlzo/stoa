<script lang="ts">
	import { tick } from 'svelte';
	import { getSpread, getVolumeReadingModel, toRomanNumeral } from '#lib/catalog/reading.ts';
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
	const canPrev = $derived(spreadIndex > 0);
	const canNext = $derived(spreadIndex < totalSpreads - 1);

	let isMobilePortrait = $state(false);
	let canHover = $state(true);
	let indicator = $state<HTMLButtonElement>();
	let controls = $state<HTMLDivElement>();
	let timer: ReturnType<typeof setTimeout>;

	function scheduleFade() {
		clearTimeout(timer);
		if (!canHover) return;
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
		if (canHover && readingHud.visible && !drawerOpen) scheduleFade();
		return () => clearTimeout(timer);
	});

	// Touch screens cannot hover to bring back faded controls, so keep Reading Mode controls visible
	// unless the reader explicitly taps to hide them.
	$effect(() => {
		const media = window.matchMedia('(hover: hover) and (pointer: fine)');
		function updateHoverCapability(): void {
			canHover = media.matches;
			if (!canHover) {
				clearTimeout(timer);
				readingHud.visible = true;
				readingHud.dismissPoint = null;
			}
		}
		updateHoverCapability();
		media.addEventListener('change', updateHoverCapability);
		return () => {
			media.removeEventListener('change', updateHoverCapability);
		};
	});

	function onHover(event: PointerEvent) {
		if (phase !== 'reading' || event.pointerType !== 'mouse' || event.buttons !== 0) return;
		canHover = true;
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

	function onPointerDown(event: PointerEvent) {
		if (event.pointerType !== 'mouse') {
			canHover = false;
			clearTimeout(timer);
		}
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
		if (spread.index === 0) return 'Title Page';
		if (spread.rightPage.kind === 'stanza' && spread.rightPage.stanzaNumber !== undefined) {
			return 'Stanza ' + spread.rightPage.stanzaNumber;
		}
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

	interface NavigationChoice {
		readonly key: number;
		readonly marker: string;
		readonly label: string;
		readonly startPageIndex: number;
		readonly active: boolean;
	}

	const navigationChoices = $derived.by((): readonly NavigationChoice[] => {
		if (!model) return [];
		if (model.chapters.length > 0) {
			return model.chapters.map((chapter) => ({
				key: chapter.index,
				marker: chapter.romanNumeral,
				label: chapter.title,
				startPageIndex: chapter.startPageIndex,
				active: chapter.index === spread?.chapterIndex
			}));
		}
		return model.spreads
			.filter((s) => s.rightPage.kind === 'stanza' && s.rightPage.stanzaNumber !== undefined)
			.map((s) => {
				const num = s.rightPage.stanzaNumber!;
				return {
					key: s.index,
					marker: toRomanNumeral(num),
					label: `Stanza ${num}`,
					startPageIndex: s.leftPage.index,
					active: s.index === spread?.index
				};
			});
	});

	const hasChapters = $derived((model?.chapters.length ?? 0) > 0);
	const drawerTitle = $derived(hasChapters ? 'Chapters' : 'Stanzas');
	const choosePrompt = $derived(hasChapters ? 'Choose Chapter' : 'Choose Stanza');
</script>

<svelte:window onpointermove={onHover} onpointerdown={onPointerDown} />

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
			<h1 class="font-volume text-xl leading-tight sm:text-2xl">
				{volume.title}
			</h1>
			{#if navigationChoices.length === 0}
				<p class="study-action mt-1 inline-flex cursor-default items-center border-b border-brass/60 bg-ink/95">
					{volume.author}, {spreadLabel}
				</p>
			{:else}
				<div data-chapters class="pointer-events-auto relative mt-1">
					<button
						type="button"
						bind:this={indicator}
						disabled={!!getLeafTurn()}
						aria-label={`${choosePrompt}, ${chapterLabel ?? volume.author}, ${spreadLabel}`}
						aria-expanded={drawerOpen}
						aria-controls="chapter-drawer"
						onclick={() => {
							drawerOpen = !drawerOpen;
							reveal();
						}}
						class="study-action max-w-full truncate border-b border-brass/60 bg-ink/95 text-left enabled:hover:bg-ink"
					>
						{#if chapterLabel}
							{chapterLabel}, {spreadLabel}
						{:else}
							{volume.author}, {spreadLabel}
						{/if}
						<span aria-hidden="true"> ▾</span>
					</button>
					{#if drawerOpen}
						<nav
							id="chapter-drawer"
							aria-label={drawerTitle}
							class="absolute top-full left-0 z-10 mt-1 max-h-[50dvh] w-80 max-w-[calc(100vw-3.5rem)] overflow-y-auto overscroll-contain border-t-2 border-brass bg-paper p-2 text-left text-ink shadow-lg"
						>
							{#each navigationChoices as choice (choice.key)}
								<button
									type="button"
									aria-current={choice.active ? 'location' : undefined}
									onclick={() => {
										jumpToReadingPage(choice.startPageIndex);
										void closeDrawer();
									}}
									class="chapter-choice"
								>
									<span class="text-xs text-muted">{choice.marker}</span>
									<span class="font-volume text-base">{choice.label}</span>
								</button>
							{/each}
						</nav>
					{/if}
				</div>
			{/if}
		</header>

		<!-- Bottom floating Reading Mode action bar -->
		<div class="relative z-10 flex w-full flex-col items-center gap-1.5 sm:gap-2">
			{#if isMobilePortrait}
				<!-- Tablet/wider portrait single-Page focus switcher (ADR 0004) -->
				<div class="hidden gap-4 sm:flex">
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

			<div class="flex w-full flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
				<!-- Primary reading navigation: Prev / (Left | Right on mobile portrait) / Next -->
				<div
					class="grid w-full grid-cols-[1fr_auto_1fr] items-center sm:flex sm:w-auto sm:items-center sm:gap-4"
				>
					<button
						type="button"
						disabled={!!getLeafTurn() || phase !== 'reading' || !canPrev}
						onclick={() => startLeafTurn(-1)}
						aria-label="Previous Spread"
						class="volume-action justify-self-start text-base sm:text-xl"
					>
						<span class="mr-1 sm:hidden" aria-hidden="true">‹</span><span class="sm:hidden">Prev</span><span class="hidden sm:inline">Previous</span>
					</button>

					{#if isMobilePortrait}
						<div
							role="group"
							aria-label="Focused Page"
							class="pointer-events-auto inline-flex items-center justify-self-center rounded-xs border border-brass/50 bg-ink/85 p-0.5 shadow-sm backdrop-blur-xs sm:hidden"
						>
							{#each pageSides as side}
								<button
									type="button"
									disabled={!!getLeafTurn() || phase !== 'reading'}
									aria-pressed={focusedSide === side}
									aria-label={side === 'left' ? 'Left Page' : 'Right Page'}
									onclick={() => setFocusedPageSide(side)}
									class="min-h-10 min-w-14 cursor-pointer rounded-xs px-2.5 font-volume text-sm font-medium text-paper/75 underline-offset-4 transition-colors disabled:cursor-default disabled:opacity-45 aria-[pressed=true]:bg-paper/15 aria-[pressed=true]:text-paper aria-[pressed=true]:underline aria-[pressed=true]:decoration-brass"
								>
									{side === 'left' ? 'Left' : 'Right'}
								</button>
							{/each}
						</div>
					{:else}
						<span class="sm:hidden" aria-hidden="true"></span>
					{/if}

					<button
						type="button"
						disabled={!!getLeafTurn() || phase !== 'reading' || !canNext}
						onclick={() => startLeafTurn(1)}
						aria-label="Next Spread"
						class="volume-action justify-self-end text-base sm:text-xl"
					>
						Next<span class="ml-1 sm:hidden" aria-hidden="true">›</span>
					</button>
				</div>

				<!-- Secondary session/exit actions -->
				<div
					class="flex w-full items-center justify-between border-t border-paper/20 pt-0.5 sm:w-auto sm:justify-end sm:gap-4 sm:border-0 sm:pt-0"
				>
					<button
						type="button"
						onclick={requestCloseToInspect}
						class="volume-action text-sm text-paper/85 sm:text-xl sm:text-paper"
					>
						Close
					</button>
					<button
						type="button"
						onclick={requestReturnToShelfFromReading}
						class="volume-action text-sm text-paper/85 sm:text-xl sm:text-paper"
					>
						Return to Shelf
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<script lang="ts">
	import { getPeekAnchor } from '#lib/state/library.svelte.ts';

	const anchor = $derived(getPeekAnchor());
	const isPlaceholder = $derived(anchor?.volume.kind === 'placeholder');
</script>

{#if anchor && anchor.visible}
	<div
		role="status"
		aria-live="polite"
		data-testid="volume-peek-cue"
		data-volume-id={anchor.volume.id}
		data-volume-kind={anchor.volume.kind}
		class="pointer-events-none fixed z-20 -translate-x-1/2 -translate-y-full transition-opacity duration-150"
		style:left={`clamp(5.5rem, ${anchor.screenX.toFixed(1)}px, calc(100vw - 5.5rem))`}
		style:top={`max(3.75rem, ${(anchor.screenY - 10).toFixed(1)}px)`}
	>
		{#if isPlaceholder}
			<div
				class="flex flex-col items-center gap-0.5 rounded-full border border-stone-700/60 bg-stone-900/90 px-3.5 py-1.5 text-center shadow-sm backdrop-blur-xs"
			>
				<span class="max-w-44 truncate text-[11px] font-medium tracking-wide text-stone-200">
					{anchor.volume.title}
				</span>
				<span class="text-[10px] font-medium tracking-[0.14em] text-stone-400 uppercase">
					Coming Soon
				</span>
			</div>
		{:else}
			<div
				class="flex items-center gap-2 rounded-full border border-stone-300/80 bg-stone-50/95 px-3.5 py-1.5 text-center shadow-sm backdrop-blur-xs"
			>
				<span class="h-1.5 w-1.5 rounded-full bg-amber-700/80"></span>
				<span class="text-xs font-medium tracking-wide text-stone-800">
					{anchor.volume.title}
				</span>
			</div>
		{/if}
	</div>
{/if}

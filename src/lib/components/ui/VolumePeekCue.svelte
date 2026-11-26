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
		class="pointer-events-none fixed z-20 w-max max-w-48 -translate-x-1/2 -translate-y-full"
		style:left={`clamp(6.5rem, ${anchor.screenX}px, calc(100vw - 6.5rem))`}
		style:top={`max(5rem, ${anchor.screenY - 10}px)`}
	>
		<div class="peek-label">
			<span class="font-volume text-lg leading-tight">{anchor.volume.title}</span>
			{#if isPlaceholder}
				<span class="mt-1 block text-[11px] text-muted">Coming Soon</span>
			{/if}
		</div>
	</div>
{/if}

import type { CanvasTexture } from 'three';
import type { IllustrationMotion } from '#lib/catalog/readable/types.ts';

export interface IllustrationPlacement {
	readonly drawX: number;
	readonly drawY: number;
	readonly scale: number;
}

export interface IllustrationMotionTarget {
	readonly ctx: CanvasRenderingContext2D;
	readonly texture: CanvasTexture;
	readonly motion: IllustrationMotion;
	readonly placement: IllustrationPlacement;
	readonly drawStill: () => void;
	readonly drawOverlay: () => void;
}

type StepIllustration = (delta: number) => void;

export interface IllustrationMotionController {
	readonly attach: (target: IllustrationMotionTarget) => void;
	readonly step: (delta: number) => void;
}

/**
 * Manages optional sprite-sheet animations painted onto reading Page textures.
 * Defers downloading sprite sheets while `prefers-reduced-motion: reduce` is active.
 */
export function createIllustrationMotionController(): IllustrationMotionController {
	const active = new Map<CanvasTexture, StepIllustration>();
	const reducedMotion =
		typeof window !== 'undefined' && typeof window.matchMedia === 'function'
			? window.matchMedia('(prefers-reduced-motion: reduce)')
			: null;

	function attach(target: IllustrationMotionTarget): void {
		if (typeof Image === 'undefined') return;
		const { ctx, texture, motion, placement, drawStill, drawOverlay } = target;

		let sheet: HTMLImageElement | null = null;
		let disposed = false;

		function startLoading(): void {
			if (disposed || sheet) return;
			const img = new Image();
			img.crossOrigin = 'anonymous';
			sheet = img;

			img.onload = () => {
				if (disposed) return;
				const rows = Math.ceil(motion.frameCount / motion.columns);
				const frameWidth = img.naturalWidth / motion.columns;
				const frameHeight = img.naturalHeight / rows;
				const [originX, originY] = motion.origin;
				const destX = placement.drawX + originX * placement.scale;
				const destY = placement.drawY + originY * placement.scale;
				const destW = frameWidth * placement.scale;
				const destH = frameHeight * placement.scale;
				const cycleSeconds = motion.frameCount / motion.framesPerSecond;
				let elapsed = 0;
				let lastFrame = -1;

				active.set(texture, (delta) => {
					if (reducedMotion?.matches) {
						if (lastFrame !== -1) drawStill();
						lastFrame = -1;
						elapsed = 0;
						return;
					}
					elapsed = (elapsed + delta) % cycleSeconds;
					const frame = Math.floor(elapsed * motion.framesPerSecond);
					if (frame === lastFrame) return;
					lastFrame = frame;

					ctx.save();
					ctx.beginPath();
					ctx.rect(destX, destY, destW, destH);
					ctx.clip();
					ctx.drawImage(
						img,
						(frame % motion.columns) * frameWidth,
						Math.floor(frame / motion.columns) * frameHeight,
						frameWidth,
						frameHeight,
						destX,
						destY,
						destW,
						destH
					);
					drawOverlay();
					ctx.restore();
					texture.needsUpdate = true;
				});
			};

			img.src = new URL(motion.src.replace(/^\/+/, ''), document.baseURI).href;
		}

		const onPreferenceChange = () => {
			if (!reducedMotion?.matches) startLoading();
		};

		const stop = () => {
			disposed = true;
			if (sheet) sheet.onload = null;
			active.delete(texture);
			reducedMotion?.removeEventListener('change', onPreferenceChange);
			texture.removeEventListener('dispose', stop);
		};

		texture.addEventListener('dispose', stop);
		if (reducedMotion?.matches) {
			reducedMotion.addEventListener('change', onPreferenceChange);
			return;
		}
		startLoading();
	}

	return {
		attach,
		step(delta: number) {
			for (const step of active.values()) step(delta);
		}
	};
}

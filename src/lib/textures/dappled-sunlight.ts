import { CanvasTexture, ClampToEdgeWrapping } from 'three';
import { createSeededRandom } from '#lib/catalog/lookdev.ts';
import { configurePbrTexture } from '#lib/textures/pbr-texture-cache.ts';

export interface DappledSunlightBundle {
	readonly texture: CanvasTexture;
	dispose(): void;
}

/**
 * Generates a soft, feathered dappled-foliage afternoon sunlight projection map
 * for a non-shadow-casting SpotLight aimed at the right plaster wall, floor, and
 * Bookcase edge. Uses blurred organic branch/leaf silhouettes over a warm golden
 * aperture so the room catches sunlit tree-shadow dappling without hard borders.
 */
export function createDappledSunlightMap(): DappledSunlightBundle {
	const size = 512;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d')!;
	const random = createSeededRandom(41917);

	// Soft golden circular light pool that feathers smoothly to black at the edges.
	ctx.fillStyle = '#000000';
	ctx.fillRect(0, 0, size, size);

	const aperture = ctx.createRadialGradient(
		size * 0.54,
		size * 0.46,
		size * 0.08,
		size * 0.5,
		size * 0.5,
		size * 0.49
	);
	aperture.addColorStop(0, '#fff2d6');
	aperture.addColorStop(0.55, '#ffe0ad');
	aperture.addColorStop(0.82, '#805c38');
	aperture.addColorStop(1, '#000000');
	ctx.fillStyle = aperture;
	ctx.fillRect(0, 0, size, size);

	// Paint soft diagonal tree branches and clustered leaf shadows in a blurred layer.
	const shadowLayer = document.createElement('canvas');
	shadowLayer.width = size;
	shadowLayer.height = size;
	const sctx = shadowLayer.getContext('2d')!;
	sctx.strokeStyle = 'rgba(0, 0, 0, 0.72)';
	sctx.fillStyle = 'rgba(0, 0, 0, 0.68)';

	// Four sweeping diagonal branch stems crossing from upper-right toward lower-left.
	const branches: readonly (readonly [number, number, number, number, number])[] = [
		[490, 60, 120, 290, 11],
		[500, 170, 95, 420, 9],
		[420, 20, 180, 220, 8],
		[460, 280, 175, 485, 8]
	];

	for (const [x0, y0, x1, y1, width] of branches) {
		sctx.lineWidth = width;
		sctx.lineCap = 'round';
		sctx.beginPath();
		sctx.moveTo(x0, y0);
		sctx.quadraticCurveTo((x0 + x1) * 0.52, (y0 + y1) * 0.45, x1, y1);
		sctx.stroke();

		// Organic clusters of overlapping oval leaves along each branch.
		const leafClusters = 16;
		for (let i = 0; i < leafClusters; i++) {
			const t = 0.08 + (i / (leafClusters - 1)) * 0.84;
			const bx = x0 + (x1 - x0) * t;
			const by = y0 + (y1 - y0) * t;
			for (let k = 0; k < 3; k++) {
				const spreadX = (random() - 0.5) * 62;
				const spreadY = (random() - 0.5) * 52;
				const rx = 14 + random() * 20;
				const ry = 7 + random() * 11;
				const angle = -0.65 + (random() - 0.5) * 0.9;
				sctx.beginPath();
				sctx.ellipse(bx + spreadX, by + spreadY, rx, ry, angle, 0, Math.PI * 2);
				sctx.fill();
			}
		}
	}

	// Composite the foliage shadows with a soft Gaussian blur so edges feel like real sunlight.
	ctx.save();
	ctx.filter = 'blur(9px)';
	ctx.drawImage(shadowLayer, 0, 0);
	ctx.restore();

	const texture = configurePbrTexture(new CanvasTexture(canvas), 'albedo', {
		wrapS: ClampToEdgeWrapping,
		wrapT: ClampToEdgeWrapping
	});

	return {
		texture,
		dispose() {
			texture.dispose();
		}
	};
}

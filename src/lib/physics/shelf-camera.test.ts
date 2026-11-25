import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	BOOKCASE_DIMENSIONS,
	ROOM_BACKDROP_DIMENSIONS,
	SHELF_CAMERA_DEFAULTS,
	getBookcaseStructure,
	getShelfSurfaceY
} from '#lib/catalog/bookcase.ts';
import {
	SHELF_CAMERA_CONFIG,
	applyDragPan,
	applyPinchZoom,
	applyWheelImpulse,
	clampDelta,
	computeDefaultCameraZ,
	computeShelfCameraBounds,
	createShelfCameraState,
	getVisibleHeightAtDistance,
	stepShelfCamera
} from '#lib/physics/shelf-camera.ts';

const VIEWPORTS = [
	{ name: 'desktop 1200x760', width: 1200, height: 760 },
	{ name: 'desktop 16:9 (1920x1080)', width: 1920, height: 1080 },
	{ name: 'ultrawide 21:9 (2560x1080)', width: 2560, height: 1080 },
	{ name: 'tablet portrait (768x1024)', width: 768, height: 1024 },
	{ name: 'mobile portrait (390x844)', width: 390, height: 844 }
] as const;

describe('Shelf Mode camera bounds (ADR 0007)', () => {
	const room = ROOM_BACKDROP_DIMENSIONS;
	const wallZ = -(BOOKCASE_DIMENSIONS.depth + room.baseboardDepth + room.wallOffsetBehindBookcase);
	const { bounds: bookcaseBounds } = getBookcaseStructure();

	for (const viewport of VIEWPORTS) {
		it(`never exposes void beyond the RoomBackdrop across zoom levels on ${viewport.name}`, () => {
			const defaultBounds = computeShelfCameraBounds(viewport);
			const testZooms = [
				defaultBounds.minZ,
				computeDefaultCameraZ(viewport),
				defaultBounds.maxZ
			];
			const aspect = viewport.width / viewport.height;

			for (const z of testZooms) {
				const bounds = computeShelfCameraBounds(viewport, z);
				const distanceToWall = z - wallZ;
				const halfWallH = getVisibleHeightAtDistance(distanceToWall) / 2;
				const halfWallW = halfWallH * aspect;

				assert.ok(bounds.minX <= bounds.maxX, 'minX must be <= maxX');
				assert.ok(bounds.minY <= bounds.maxY, 'minY must be <= maxY');

				assert.ok(
					bounds.maxX + halfWallW <= room.wallWidth / 2 + 1e-6,
					`z=${z.toFixed(2)}m: right frustum edge (${(bounds.maxX + halfWallW).toFixed(3)}m) must stay within room wall (+${room.wallWidth / 2}m)`
				);
				assert.ok(
					bounds.minX - halfWallW >= -room.wallWidth / 2 - 1e-6,
					`z=${z.toFixed(2)}m: left frustum edge (${(bounds.minX - halfWallW).toFixed(3)}m) must stay within room wall (-${room.wallWidth / 2}m)`
				);
				assert.ok(
					bounds.maxY + halfWallH <= room.wallHeight + 1e-6,
					`z=${z.toFixed(2)}m: top frustum edge (${(bounds.maxY + halfWallH).toFixed(3)}m) must stay within room wall (${room.wallHeight}m)`
				);
				assert.ok(
					bounds.minY >= SHELF_CAMERA_CONFIG.minFloorClearance - 1e-6,
					`z=${z.toFixed(2)}m: minY (${bounds.minY.toFixed(3)}m) must stay safely above the floor`
				);
			}
		});

		it(`allows vertical panning across all 5 Shelves on ${viewport.name}`, () => {
			const z = computeDefaultCameraZ(viewport);
			const bounds = computeShelfCameraBounds(viewport, z);
			const halfFrontH = getVisibleHeightAtDistance(z) / 2;
			const bottomShelfSurface = getShelfSurfaceY(0);
			const topShelfTop =
				getShelfSurfaceY(BOOKCASE_DIMENSIONS.shelfCount - 1) + BOOKCASE_DIMENSIONS.shelfClearance;

			assert.ok(
				bounds.minY - halfFrontH <= bottomShelfSurface,
				'bottom pan limit must bring Shelf 0 into view'
			);
			assert.ok(
				bounds.maxY + halfFrontH >= topShelfTop,
				'top pan limit must bring Shelf 4 into view'
			);
		});
	}

	it('frames the full Bookcase width by default on mobile while keeping desktop at 1.52 m', () => {
		const desktop = { width: 1200, height: 760 };
		const mobile = { width: 390, height: 844 };

		const desktopZ = computeDefaultCameraZ(desktop);
		const mobileZ = computeDefaultCameraZ(mobile);

		assert.equal(desktopZ, SHELF_CAMERA_DEFAULTS.distance, 'desktop default Z should remain 1.52 m');
		assert.ok(mobileZ > desktopZ, 'mobile default Z should pull back to fit the full Bookcase width');

		const mobileHalfFrontW = (getVisibleHeightAtDistance(mobileZ) / 2) * (mobile.width / mobile.height);
		assert.ok(
			mobileHalfFrontW >= bookcaseBounds.innerMaxX - 1e-6,
			`mobile default half-width (${mobileHalfFrontW.toFixed(3)}m) must cover interior Shelf half-width (${bookcaseBounds.innerMaxX.toFixed(3)}m)`
		);
	});

	it('gives desktop subtle horizontal give and lets zoomed-in mobile pan across the full Bookcase', () => {
		const desktop = computeShelfCameraBounds({ width: 1200, height: 760 });
		const mobileZoomedIn = computeShelfCameraBounds({ width: 390, height: 844 }, 1.52);

		assert.ok(
			desktop.maxX >= SHELF_CAMERA_CONFIG.desktopHorizontalGive - 1e-6,
			'desktop should have gentle horizontal give'
		);
		assert.ok(
			mobileZoomedIn.maxX > desktop.maxX,
			'zoomed-in mobile portrait should have wider horizontal pan travel than desktop'
		);

		const mobileHalfFrontW = (getVisibleHeightAtDistance(1.52) / 2) * (390 / 844);
		assert.ok(
			mobileZoomedIn.maxX + mobileHalfFrontW >= bookcaseBounds.maxX,
			'mobile right pan limit must reach the right edge of the Bookcase'
		);
		assert.ok(
			mobileZoomedIn.minX - mobileHalfFrontW <= bookcaseBounds.minX,
			'mobile left pan limit must reach the left edge of the Bookcase'
		);
	});
});

describe('Shelf Mode camera inertia, pinch zoom, and clamping', () => {
	const desktopViewport = { width: 1200, height: 760 };
	const mobileViewport = { width: 390, height: 844 };

	it('clamps delta to maxDelta so tab switches never cause jumps', () => {
		assert.equal(clampDelta(5.0), SHELF_CAMERA_CONFIG.maxDelta);
		assert.equal(clampDelta(0.016), 0.016);
		assert.equal(clampDelta(-0.1), 0);
		assert.equal(clampDelta(Number.NaN), 0);
	});

	it('settles smoothly with inertia after pointer release and comes to a full stop', () => {
		const bounds = computeShelfCameraBounds(desktopViewport);
		const state = createShelfCameraState(desktopViewport);
		state.isDragging = true;
		applyDragPan(state, 0, 120, 0.016, desktopViewport.height, bounds);
		state.isDragging = false;

		const yAtRelease = state.y;
		assert.ok(state.vy > 0, 'dragging down should impart upward (+Y) release velocity');

		for (let i = 0; i < 120; i++) {
			stepShelfCamera(state, desktopViewport, 1 / 60);
		}

		assert.ok(state.y > yAtRelease, 'camera should glide further after release');
		assert.ok(state.y <= bounds.maxY, 'camera must remain within upper bound');
		assert.equal(state.vx, 0, 'horizontal velocity should settle to 0');
		assert.equal(state.vy, 0, 'vertical velocity should settle to 0');
	});

	it('hard-clamps position and zeros velocity against bounds on wheel scroll', () => {
		const bounds = computeShelfCameraBounds(desktopViewport);
		const state = createShelfCameraState(desktopViewport);

		for (let i = 0; i < 30; i++) {
			applyWheelImpulse(state, 0, 400, 0, desktopViewport.height, bounds);
			stepShelfCamera(state, desktopViewport, 1 / 60);
		}

		assert.equal(state.y, bounds.minY, 'camera should hard-clamp at minY');
		assert.equal(state.vy, 0, 'downward velocity should be zeroed at minY');
	});

	it('pinch-zooms smoothly on mobile and clamps cleanly to [minZ, maxZ]', () => {
		const state = createShelfCameraState(mobileViewport);
		const initialZ = state.z;
		const bounds = computeShelfCameraBounds(mobileViewport, state.z);

		// Spread fingers apart (ratio < 1) -> zoom in strongly
		applyPinchZoom(state, 0.1, bounds);
		for (let i = 0; i < 90; i++) {
			stepShelfCamera(state, mobileViewport, 1 / 60);
		}
		assert.equal(state.z, bounds.minZ, 'pinch-in should clamp at minZ');
		assert.ok(state.z < initialZ, 'pinch-in should move camera closer');

		// Pinch fingers together (ratio > 1) -> zoom back out
		applyPinchZoom(state, 10, bounds);
		for (let i = 0; i < 90; i++) {
			stepShelfCamera(state, mobileViewport, 1 / 60);
		}
		assert.equal(state.z, bounds.maxZ, 'pinch-out should clamp at maxZ');
	});
});

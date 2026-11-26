import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { layoutCatalogOnBookcase } from '#lib/catalog/layout.ts';
import {
	INSPECT_VOLUME_CONFIG,
	applyInspectWheelZoom,
	clampPitch,
	computeInspectPose,
	computeVolumeShelfCenter,
	createInspectOrbitGestures,
	createInspectVolumeState,
	evaluateInspectTransform,
	normalizeAngle,
	startInspectEnter,
	startInspectReturn,
	stepInspectVolume
} from '#lib/physics/inspect-volume.ts';

const placedVolumes = layoutCatalogOnBookcase();
const odyssey = placedVolumes.find((v) => v.volume.id === 'the-odyssey')!;
const leaningVolume = placedVolumes.find((v) => Math.abs(v.rotationZ) > 0.01)!;

describe('inspect-volume physics', () => {
	it('computes exact shelf center so resting transform matches placed.position for upright and leaning Volumes', () => {
		for (const placed of [odyssey, leaningVolume]) {
			const center = computeVolumeShelfCenter(placed, 0);
			const halfHeight = placed.volume.dimensions.height / 2;
			const halfDepth = placed.volume.dimensions.depth / 2;
			const sinZ = Math.sin(placed.rotationZ);
			const cosZ = Math.cos(placed.rotationZ);

			// Reconstruct local (0, 0, 0) bottom-front spine edge from center + rotated (0, -halfHeight, +halfDepth)
			const spineX = center[0] + halfHeight * sinZ;
			const spineY = center[1] - halfHeight * cosZ;
			const spineZ = center[2] + halfDepth;

			assert.ok(Math.abs(spineX - placed.position[0]) < 1e-9);
			assert.ok(Math.abs(spineY - placed.position[1]) < 1e-9);
			assert.ok(Math.abs(spineZ - placed.position[2]) < 1e-9);
		}
	});

	it('frames the inspected Volume cleanly in front of the Bookcase on desktop, mobile portrait, and zoomed-in cameras', () => {
		const desktop = computeInspectPose([0, 1.0, 2.25], 38, { width: 1280, height: 800 }, odyssey.volume.dimensions);
		assert.ok(desktop.center[2] > 0.32 && desktop.center[2] < 2.0);
		assert.ok(desktop.backdropZ < desktop.center[2] - 0.15);
		assert.ok(desktop.backdropZ >= 0.12);

		const mobile = computeInspectPose([0, 1.0, 2.6], 44, { width: 390, height: 844 }, odyssey.volume.dimensions);
		assert.ok(mobile.center[2] > 0.32 && mobile.center[2] < 2.2);
		assert.ok(mobile.backdropZ < mobile.center[2] - 0.15);

		const zoomedIn = computeInspectPose([0, 1.0, 1.0], 44, { width: 390, height: 844 }, odyssey.volume.dimensions);
		assert.ok(zoomedIn.center[2] >= INSPECT_VOLUME_CONFIG.minInspectZ - 1e-6);
		assert.ok(zoomedIn.backdropZ >= 0.12);
	});

	it('performs staged finger-hook tilt, in-lane +Z pull-out, grip pause, shelf-clear trigger, and glide into Inspect Mode', () => {
		const state = createInspectVolumeState();
		startInspectEnter(state, 0.036);
		const pose = computeInspectPose([0, 1.0, 2.25], 38, { width: 1280, height: 800 }, odyssey.volume.dimensions);
		const restCenter = computeVolumeShelfCenter(odyssey, 0.036);

		// Stage 1 (inside slot extraction): tilts forward, moves strictly +Z with zero X drift or yaw!
		stepInspectVolume(state, 0.05);
		stepInspectVolume(state, 0.05);
		const stage1 = evaluateInspectTransform(state, odyssey, pose.center);
		assert.equal(stage1.position[0], restCenter[0], 'Must stay strictly in-lane X during Stage 1');
		assert.ok(stage1.position[2] > restCenter[2], 'Must pull forward along +Z during Stage 1');
		assert.ok(stage1.rotation[0] > 0, 'Must tilt forward (positive pitch) during Stage 1');
		assert.equal(stage1.rotation[1], 0, 'Must not yaw while still inside the Shelf slot');
		assert.equal(stage1.backdropOpacity, 0, 'Backdrop stays bright until glide stage');

		let clearedShelfCount = 0;
		let entered = false;
		for (let i = 0; i < 30; i++) {
			const res = stepInspectVolume(state, 0.05);
			if (res.clearedShelf) clearedShelfCount += 1;
			if (res.enteredInspect) entered = true;
		}
		assert.equal(clearedShelfCount, 1, 'Shelf-clear domino trigger should fire exactly once');
		assert.equal(entered, true);
		assert.equal(state.phase, 'inspecting');
		assert.equal(state.progress, 1);

		const settled = evaluateInspectTransform(state, odyssey, pose.center);
		assert.deepEqual(settled.position, pose.center);
		assert.ok(Math.abs(settled.rotation[0] - INSPECT_VOLUME_CONFIG.defaultPitch) < 1e-9);
		assert.ok(Math.abs(settled.rotation[1] - INSPECT_VOLUME_CONFIG.defaultYaw) < 1e-9);
		assert.equal(settled.rotation[2], 0);
		assert.ok(Math.abs(settled.backdropOpacity - INSPECT_VOLUME_CONFIG.backdropMaxOpacity) < 1e-9);
	});

	it('supports unbounded 360° yaw, strictly clamps ±65° pitch, and decays orbit inertia to rest', () => {
		const state = createInspectVolumeState();
		state.phase = 'inspecting';
		state.progress = 1;

		const gestures = createInspectOrbitGestures(state);
		gestures.start(1, 200, 200, 0);
		// Small move under threshold does not start dragging
		assert.equal(gestures.move(1, 203, 202, 16), false);
		assert.equal(state.isDragging, false);

		// Large horizontal & vertical drag starts orbiting
		assert.equal(gestures.move(1, 220, 200, 32), true);
		assert.equal(state.isDragging, true);
		// Spin well past 360° horizontally and push pitch well past +65°
		gestures.move(1, 1200, 800, 48);
		const endResult = gestures.end(1, 52);
		assert.equal(endResult.kind, 'drag');
		assert.equal(state.isDragging, false);
		assert.ok(state.yaw > Math.PI * 2);
		assert.equal(state.pitch, INSPECT_VOLUME_CONFIG.maxPitch);
		assert.ok(Math.abs(state.yawVelocity) > 0.1);

		const yawAtRelease = state.yaw;
		for (let i = 0; i < 60; i++) {
			stepInspectVolume(state, 0.05);
		}
		assert.ok(state.yaw > yawAtRelease);
		assert.equal(state.yawVelocity, 0);
		assert.equal(state.pitchVelocity, 0);
		assert.equal(clampPitch(2.0), INSPECT_VOLUME_CONFIG.maxPitch);
		assert.equal(clampPitch(-2.0), -INSPECT_VOLUME_CONFIG.maxPitch);
	});

	it('distinguishes a backdrop click from an orbit drag', () => {
		const state = createInspectVolumeState();
		state.phase = 'inspecting';
		state.progress = 1;
		const gestures = createInspectOrbitGestures(state);

		gestures.start(7, 100, 100, 0);
		gestures.move(7, 102, 101, 16);
		const result = gestures.end(7, 32);
		assert.equal(result.kind, 'click');
	});

	it('unwraps multi-spin yaw to shortest path on return and seats flush back in its Shelf slot', () => {
		const state = createInspectVolumeState();
		state.phase = 'inspecting';
		state.progress = 1;
		state.yaw = Math.PI * 6 + 0.4;
		state.pitch = 0.3;

		startInspectReturn(state);
		assert.equal(state.phase, 'returning');
		assert.ok(Math.abs(state.returnStartYaw - 0.4) < 1e-9);
		assert.ok(Math.abs(normalizeAngle(-Math.PI * 4 - 0.25) - -0.25) < 1e-9);

		let completed = false;
		for (let i = 0; i < 30; i++) {
			const res = stepInspectVolume(state, 0.05);
			if (res.completedReturn) completed = true;
		}
		assert.equal(completed, true);
		assert.equal(state.phase, 'idle');
		assert.equal(state.progress, 0);

		const pose = computeInspectPose([0, 1.0, 2.25], 38, { width: 1280, height: 800 }, odyssey.volume.dimensions);
		const finalTransform = evaluateInspectTransform(state, odyssey, pose.center);
		assert.deepEqual(finalTransform.position, computeVolumeShelfCenter(odyssey, 0));
		assert.deepEqual(finalTransform.rotation, [0, 0, odyssey.rotationZ]);
		assert.equal(finalTransform.backdropOpacity, 0);
	});

	it('supports wheel and two-finger pinch zoom in Inspect Mode within safe bounds and resets on return', () => {
		const state = createInspectVolumeState();
		startInspectEnter(state, 0);
		state.progress = 1;
		state.phase = 'inspecting';

		const basePose = computeInspectPose(
			[0, 1.0, 2.25],
			38,
			{ width: 1280, height: 800 },
			odyssey.volume.dimensions,
			INSPECT_VOLUME_CONFIG,
			1
		);

		// Wheel zoom in brings the Volume closer to the camera (larger Z).
		applyInspectWheelZoom(state, -400, 0);
		assert.ok(state.targetZoom > 1 && state.targetZoom <= INSPECT_VOLUME_CONFIG.maxZoom);
		for (let i = 0; i < 45; i += 1) {
			stepInspectVolume(state, 1 / 60);
		}
		assert.ok(state.zoom > 1.2);

		const zoomedPose = computeInspectPose(
			[0, 1.0, 2.25],
			38,
			{ width: 1280, height: 800 },
			odyssey.volume.dimensions,
			INSPECT_VOLUME_CONFIG,
			state.zoom
		);
		assert.ok(zoomedPose.center[2] > basePose.center[2]);
		assert.ok(zoomedPose.backdropZ < zoomedPose.center[2]);

		// Two-finger pinch out zooms back down toward minZoom.
		const gestures = createInspectOrbitGestures(state);
		gestures.start(1, 100, 100, 0);
		gestures.start(2, 300, 100, 10);
		gestures.move(2, 150, 100, 30);
		gestures.end(2, 40);
		gestures.end(1, 50);
		assert.ok(state.targetZoom < state.zoom);
		assert.ok(state.targetZoom >= INSPECT_VOLUME_CONFIG.minZoom);

		// Return flight resets zoom cleanly back to 1.
		startInspectReturn(state);
		assert.equal(state.targetZoom, 1);
	});

	it('frames inspected Volumes closer by default on narrow mobile portrait screens', () => {
		const camPos: readonly [number, number, number] = [0, 1.0, 2.25];
		const mobilePose = computeInspectPose(
			camPos,
			46,
			{ width: 390, height: 844 },
			odyssey.volume.dimensions
		);
		const desktopFillOnMobile = computeInspectPose(
			camPos,
			46,
			{ width: 390, height: 844 },
			odyssey.volume.dimensions,
			{ ...INSPECT_VOLUME_CONFIG, mobileViewportFillRatio: INSPECT_VOLUME_CONFIG.viewportFillRatio }
		);
		// Closer framing means larger Z (closer to camera at z = 2.25).
		assert.ok(mobilePose.center[2] > desktopFillOnMobile.center[2]);
		assert.ok(mobilePose.backdropZ < mobilePose.center[2]);
	});
});

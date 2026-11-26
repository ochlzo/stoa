import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CATALOG } from '#lib/catalog/volumes.ts';
import {
	READING_VOLUME_CONFIG,
	applyReadingWheelZoom,
	computeOpenVolumeDimensions,
	computePageStackSplit,
	computeReadingPose,
	createReadingTiltGestures,
	createReadingVolumeState,
	evaluateOpenVolumePose,
	startReadingClose,
	startReadingOpen,
	stepReadingVolume
} from '#lib/physics/reading-volume.ts';

const odyssey = CATALOG.find((v) => v.id === 'the-odyssey')!;

function assertClose(actual: number, expected: number, eps = 1e-6): void {
	assert.ok(Math.abs(actual - expected) <= eps, `Expected ${actual} to be within ${eps} of ${expected}`);
}

describe('Reading Mode open Volume geometry, stack split, and framing', () => {
	it('preserves total page-block thickness across reading progress [0..1] without zero-thickness collapse', () => {
		const openDims = computeOpenVolumeDimensions(
			odyssey.dimensions,
			odyssey.spineProfile,
			odyssey.bindingStyle
		);

		const startSplit = computePageStackSplit(openDims.totalPageThickness, 0);
		const midSplit = computePageStackSplit(openDims.totalPageThickness, 0.5);
		const endSplit = computePageStackSplit(openDims.totalPageThickness, 1);

		assertClose(startSplit.leftThickness + startSplit.rightThickness, openDims.totalPageThickness);
		assertClose(midSplit.leftThickness + midSplit.rightThickness, openDims.totalPageThickness);
		assertClose(endSplit.leftThickness + endSplit.rightThickness, openDims.totalPageThickness);

		// Left stack grows monotonically as reading progresses; right stack shrinks.
		assert.ok(startSplit.leftThickness >= READING_VOLUME_CONFIG.minStackThickness);
		assert.ok(endSplit.rightThickness >= READING_VOLUME_CONFIG.minStackThickness);
		assert.ok(startSplit.leftThickness < midSplit.leftThickness);
		assert.ok(midSplit.leftThickness < endSplit.leftThickness);
		assert.ok(startSplit.rightThickness > midSplit.rightThickness);
		assert.ok(midSplit.rightThickness > endSplit.rightThickness);
	});

	it('frames the full two-Page Spread on desktop and focuses a single Page on mobile portrait (ADR 0004)', () => {
		const camPos: readonly [number, number, number] = [0, 0.9, 1.25];

		const desktopPose = computeReadingPose(
			camPos,
			38,
			{ width: 1280, height: 800 },
			odyssey.dimensions,
			'right',
			odyssey.spineProfile,
			odyssey.bindingStyle
		);
		assert.equal(desktopPose.isMobileSinglePage, false);
		assert.equal(desktopPose.focusOffsetX, 0);
		assertClose(desktopPose.center[0], camPos[0]);

		const mobileRight = computeReadingPose(
			camPos,
			46,
			{ width: 390, height: 844 },
			odyssey.dimensions,
			'right',
			odyssey.spineProfile,
			odyssey.bindingStyle
		);
		const mobileLeft = computeReadingPose(
			camPos,
			46,
			{ width: 390, height: 844 },
			odyssey.dimensions,
			'left',
			odyssey.spineProfile,
			odyssey.bindingStyle
		);

		assert.equal(mobileRight.isMobileSinglePage, true);
		assert.ok(mobileRight.focusOffsetX < 0);
		assert.ok(mobileLeft.focusOffsetX > 0);
		assertClose(mobileRight.focusOffsetX, -mobileLeft.focusOffsetX);
		assert.ok(mobileRight.backdropZ < mobileRight.center[2]);
	});

	it('unfolds smoothly from closed (+π) to cupped open and folds cleanly back to Inspect or Shelf', () => {
		const openDims = computeOpenVolumeDimensions(
			odyssey.dimensions,
			odyssey.spineProfile,
			odyssey.bindingStyle
		);
		const closedPose = evaluateOpenVolumePose(0, openDims);
		const openPose = evaluateOpenVolumePose(1, openDims);

		assertClose(closedPose.leftHingeAngle, Math.PI);
		assertClose(closedPose.rightHingeAngle, 0);
		assertClose(openPose.leftHingeAngle, READING_VOLUME_CONFIG.openRestAngle);
		assertClose(openPose.rightHingeAngle, -READING_VOLUME_CONFIG.openRestAngle);
		assertClose(openPose.spineShiftX, 0);

		const state = createReadingVolumeState();
		startReadingOpen(state, -Math.PI / 2, 0);
		state.alignProgress = 1;

		let finishedOpen = false;
		for (let i = 0; i < 60; i += 1) {
			const res = stepReadingVolume(state, 1 / 60, 0);
			if (res.finishedOpening) finishedOpen = true;
		}
		assert.equal(finishedOpen, true);
		assert.equal(state.phase, 'reading');
		assert.equal(state.openProgress, 1);

		// Fold back to Inspect Mode
		startReadingClose(state, 'inspect');
		let finishedClose = false;
		for (let i = 0; i < 60; i += 1) {
			const res = stepReadingVolume(state, 1 / 60, 0);
			if (res.finishedClosingToInspect) finishedClose = true;
		}
		assert.equal(finishedClose, true);
		expectZeroTilt(state);
		assert.equal(state.phase, 'idle');
		assert.equal(state.openProgress, 0);
	});

	it('tilts softly within configured bounds on drag and springs smoothly back to level on release', () => {
		const state = createReadingVolumeState();
		startReadingOpen(state, -Math.PI / 2, 0);
		state.alignProgress = 1;
		for (let i = 0; i < 60; i += 1) {
			stepReadingVolume(state, 1 / 60, 0);
		}
		assert.equal(state.phase, 'reading');

		const gestures = createReadingTiltGestures(state);
		gestures.start(1, 200, 200);
		// Huge drag should still respect ±maxTiltYaw / ±maxTiltPitch via soft tanh clamp.
		assert.equal(gestures.move(1, 600, 500), true);
		assert.equal(state.isTilting, true);
		assert.ok(state.tiltYaw > 0 && state.tiltYaw < READING_VOLUME_CONFIG.maxTiltYaw);
		assert.ok(state.tiltPitch > 0 && state.tiltPitch < READING_VOLUME_CONFIG.maxTiltPitch);

		gestures.end(1);
		assert.equal(state.isTilting, false);

		for (let i = 0; i < 120; i += 1) {
			stepReadingVolume(state, 1 / 60, 0);
		}
		expectZeroTilt(state);
	});

	it('supports wheel and two-finger pinch zoom in Reading Mode while preserving default zoom = 1 framing', () => {
		const camPos: readonly [number, number, number] = [0, 0.9, 1.52];
		const state = createReadingVolumeState();
		startReadingOpen(state, -Math.PI / 2, 0);
		state.alignProgress = 1;
		for (let i = 0; i < 60; i += 1) {
			stepReadingVolume(state, 1 / 60, 0);
		}
		assert.equal(state.zoom, 1);

		const defaultPose = computeReadingPose(
			camPos,
			38,
			{ width: 1280, height: 800 },
			odyssey.dimensions,
			'right',
			odyssey.spineProfile,
			odyssey.bindingStyle,
			READING_VOLUME_CONFIG,
			state.zoom
		);

		// Wheel zoom in brings the open Spread closer (larger Z).
		applyReadingWheelZoom(state, -420, 0);
		assert.ok(state.targetZoom > 1 && state.targetZoom <= READING_VOLUME_CONFIG.maxZoom);
		for (let i = 0; i < 45; i += 1) {
			stepReadingVolume(state, 1 / 60, 0);
		}
		assert.ok(state.zoom > 1.25);

		const zoomedPose = computeReadingPose(
			camPos,
			38,
			{ width: 1280, height: 800 },
			odyssey.dimensions,
			'right',
			odyssey.spineProfile,
			odyssey.bindingStyle,
			READING_VOLUME_CONFIG,
			state.zoom
		);
		assert.ok(zoomedPose.center[2] > defaultPose.center[2]);
		assert.ok(zoomedPose.backdropZ < zoomedPose.center[2]);

		// Two-finger pinch out zooms back down without engaging tilt.
		const gestures = createReadingTiltGestures(state);
		gestures.start(1, 100, 100);
		gestures.start(2, 300, 100);
		gestures.move(2, 160, 100);
		gestures.end(2);
		gestures.end(1);
		assert.equal(state.isTilting, false);
		assert.ok(state.targetZoom < state.zoom);
		assert.ok(state.targetZoom >= READING_VOLUME_CONFIG.minZoom);

		// Closing resets targetZoom back to 1.
		startReadingClose(state, 'inspect');
		assert.equal(state.targetZoom, 1);
	});
});

function expectZeroTilt(state: ReturnType<typeof createReadingVolumeState>): void {
	assertClose(state.tiltYaw, 0, 1e-4);
	assertClose(state.tiltPitch, 0, 1e-4);
	assertClose(state.tiltYawVelocity, 0, 1e-4);
	assertClose(state.tiltPitchVelocity, 0, 1e-4);
}

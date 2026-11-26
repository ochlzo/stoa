import assert from 'node:assert/strict';
import test from 'node:test';
import {
	VOLUME_PEEK_CONFIG,
	createVolumePeekState,
	stepVolumePeek
} from '#lib/physics/volume-peek.ts';

test('stepVolumePeek slides smoothly toward peekDistance and settles cleanly', () => {
	const state = createVolumePeekState();
	assert.equal(state.offset, 0);
	assert.equal(state.velocity, 0);

	// First step moves forward along +Z
	const moved = stepVolumePeek(state, true, 1 / 60);
	assert.equal(moved, true);
	assert.ok(state.offset > 0, 'Volume should move forward when peeked');
	assert.ok(state.offset < VOLUME_PEEK_CONFIG.peekDistance * 1.15, 'Spring should not explode');

	// Simulate 1.5 seconds at 60fps; should settle exactly to peekDistance
	for (let i = 0; i < 90; i++) {
		stepVolumePeek(state, true, 1 / 60);
	}
	assert.equal(state.offset, VOLUME_PEEK_CONFIG.peekDistance);
	assert.equal(state.velocity, 0);
	assert.equal(stepVolumePeek(state, true, 1 / 60), false);
});

test('stepVolumePeek returns smoothly to zero when unpeeked', () => {
	const state = createVolumePeekState();
	state.offset = VOLUME_PEEK_CONFIG.peekDistance;

	for (let i = 0; i < 90; i++) {
		stepVolumePeek(state, false, 1 / 60);
	}

	assert.equal(state.offset, 0);
	assert.equal(state.velocity, 0);
	assert.equal(stepVolumePeek(state, false, 1 / 60), false);
});

test('stepVolumePeek clamps huge frame deltas without exploding', () => {
	const state = createVolumePeekState();
	// Simulate a 10-second background-tab pause
	stepVolumePeek(state, true, 10);

	assert.ok(Number.isFinite(state.offset));
	assert.ok(state.offset > 0 && state.offset <= VOLUME_PEEK_CONFIG.peekDistance * 1.25);
});

test('stepVolumePeek ignores zero, negative, or non-finite deltas', () => {
	const state = createVolumePeekState();
	assert.equal(stepVolumePeek(state, true, 0), false);
	assert.equal(stepVolumePeek(state, true, -0.1), false);
	assert.equal(stepVolumePeek(state, true, Number.NaN), false);
	assert.equal(state.offset, 0);
});

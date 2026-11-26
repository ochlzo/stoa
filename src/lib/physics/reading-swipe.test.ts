import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	READING_WHEEL_TURN_CONFIG,
	createReadingWheelTurn
} from '#lib/physics/reading-swipe.ts';

describe('createReadingWheelTurn', () => {
	it('accumulates wheel deltas across events until thresholdPx and fires once per gesture', () => {
		const wheel = createReadingWheelTurn();
		const base = { deltaX: 0, deltaMode: 0, viewportHeight: 800, blocked: false };

		assert.equal(wheel.step({ ...base, deltaY: 20, timeStamp: 100 }), null);
		assert.equal(wheel.step({ ...base, deltaY: 16, timeStamp: 120 }), 1);
		// Momentum events within gestureGapMs are ignored
		assert.equal(wheel.step({ ...base, deltaY: 40, timeStamp: 160 }), null);
		assert.equal(wheel.step({ ...base, deltaY: 40, timeStamp: 250 }), null);

		// A fresh gesture after gestureGapMs can turn backwards
		assert.equal(
			wheel.step({
				...base,
				deltaY: -READING_WHEEL_TURN_CONFIG.thresholdPx,
				timeStamp: 250 + READING_WHEEL_TURN_CONFIG.gestureGapMs
			}),
			-1
		);
	});

	it('ignores horizontal scrolls and suppresses momentum started while blocked', () => {
		const wheel = createReadingWheelTurn();
		const base = { deltaMode: 0, viewportHeight: 800 };

		assert.equal(
			wheel.step({ ...base, deltaX: 50, deltaY: 20, timeStamp: 100, blocked: false }),
			null
		);

		// Blocked during active leaf turn consumes the gesture until the gap passes
		assert.equal(
			wheel.step({ ...base, deltaX: 0, deltaY: 60, timeStamp: 200, blocked: true }),
			null
		);
		assert.equal(
			wheel.step({ ...base, deltaX: 0, deltaY: 60, timeStamp: 260, blocked: false }),
			null
		);
		assert.equal(
			wheel.step({
				...base,
				deltaX: 0,
				deltaY: 60,
				timeStamp: 260 + READING_WHEEL_TURN_CONFIG.gestureGapMs,
				blocked: false
			}),
			1
		);
	});
});

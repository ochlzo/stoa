import assert from 'node:assert/strict';
import { it } from 'node:test';
import {
	createLeafTurn,
	curlLeafVertex,
	pageStackHeight,
	releaseTarget,
	stepLeafTurn,
	type LeafTurn
} from '#lib/physics/leaf-turn.ts';
import { createReadingSwipe } from '#lib/physics/reading-swipe.ts';

it('keeps the gutter fixed and lifts both turn directions above the curved stacks', () => {
	const hingeAngle = 0.09;
	for (const direction of [-1, 1] as const) {
		for (let frame = 0; frame <= 100; frame++) {
			for (let column = 0; column <= 40; column++) {
				const u = column / 40;
				const { x, z } = curlLeafVertex({
					u,
					width: 0.15,
					progress: frame / 100,
					direction,
					leftThickness: 0.003,
					rightThickness: 0.034,
					gutterDepth: 0.003,
					arch: 0.006,
					hingeAngle
				});
				const distance = Math.abs(x) * Math.cos(hingeAngle) + z * Math.sin(hingeAngle);
				const height = z * Math.cos(hingeAngle) - Math.abs(x) * Math.sin(hingeAngle);
				const stack = pageStackHeight(
					Math.min(1, distance / 0.15),
					x < 0 ? 0.003 : 0.034,
					0.003,
					0.006
				);
				assert.ok(height >= stack - 0.00002);
				if (u === 0) assert.ok(Math.abs(x) < 0.00002 && z < 0.00013);
				if (frame === 0 || frame === 100) {
					assert.ok(Math.abs(distance - u * 0.15) < 0.00003);
					assert.ok(Math.abs(height - stack) < 0.00016);
				}
			}
		}
	}
});

it('settles slow pulls, forward flicks and reversed flicks at bounded frame rates', () => {
	for (const [progress, velocity, expected] of [
		[0.25, 0, 0],
		[0.2, 2, 1],
		[0.65, -2, 0],
		[0.7, 0, 1]
	]) {
		const target = releaseTarget(progress, velocity);
		assert.equal(target, expected);
		for (const dt of [0.05, 1 / 120]) {
			const turn: LeafTurn = { direction: 1, progress, velocity, target };
			let done = false;
			for (let time = 0; time < 2 && !done; time += dt) {
				done = stepLeafTurn(turn, dt);
				assert.ok(turn.progress >= 0 && turn.progress <= 1);
			}
			assert.ok(done && Math.abs(turn.progress - expected) < 0.001);
		}
	}
});

it('pans within a portrait Spread with live drag feedback and turns across its outer boundary', () => {
	for (const side of ['left', 'right'] as const) {
		for (const dx of [-120, 120]) {
			const actions: string[] = [];
			const panOffsets: number[] = [];
			const swipe = createReadingSwipe({
				hit: { side, outerMargin: false, width: 200 },
				portrait: true,
				focusedSide: side,
				startX: 0,
				startY: 0,
				startTime: 0,
				beginTurn: (dir) => {
					actions.push('turn ' + dir);
					return null;
				},
				focusSide: (nextSide) => actions.push(nextSide),
				onPan: (ratio) => panOffsets.push(ratio)
			});
			swipe.move(dx / 2, 0, 60);
			swipe.end(dx, 1, 120, false);
			const expected =
				dx < 0 ? (side === 'left' ? 'right' : 'turn 1') : side === 'right' ? 'left' : 'turn -1';
			assert.deepEqual(actions, [expected]);
			if (expected === 'left' || expected === 'right') {
				assert.ok(panOffsets.some((ratio) => Math.abs(ratio) > 0.1));
				assert.equal(panOffsets.at(-1), 0);
			}
		}
	}
});

it('cancels a dragged Leaf when a second finger starts a pinch', () => {
	const turn = createLeafTurn(1, true);
	const swipe = createReadingSwipe({
		hit: { side: 'right', outerMargin: true, width: 200 },
		portrait: true,
		focusedSide: 'right',
		startX: 200,
		startY: 100,
		startTime: 0,
		beginTurn: () => turn,
		focusSide: () => assert.fail('unexpected Page focus')
	});
	swipe.move(50, 100, 90);
	assert.ok(turn.progress > 0.5);
	swipe.end(0, 0, 100, true);
	assert.equal(turn.target, 0);
	assert.equal(turn.velocity, 0);
});

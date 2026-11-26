import assert from 'node:assert/strict';
import { it } from 'node:test';
import {
	seedDustMotes,
	stepBackdropOpacity,
	stepStudyLighting,
	STUDY_LIGHTING
} from '#lib/physics/study-lighting.ts';

it('seeds repeatable, varied motes in the sunlit air in front of the Bookcase', () => {
	const dust = seedDustMotes(168);
	assert.deepEqual(dust, seedDustMotes(168));
	assert.notDeepEqual(dust, seedDustMotes(168, 14));
	for (let i = 0; i < 168; i++) {
		const z = dust.positions[i * 3 + 2];
		assert.ok(z > 0 && z < 0.7);
		const glow = dust.variation[i * 3 + 2];
		assert.ok(glow > 0 && glow <= 1);
	}
});

it('approaches each lighting target without overshoot, even after an interrupted transition', () => {
	const current = { ...STUDY_LIGHTING.shelf };
	for (const target of [STUDY_LIGHTING.inspect, STUDY_LIGHTING.reading, STUDY_LIGHTING.shelf]) {
		const before = { ...current };
		const capped = { ...current };
		stepStudyLighting(current, target, 8);
		stepStudyLighting(capped, target, 0.05);
		assert.deepEqual(current, capped);
		for (const key of Object.keys(current) as (keyof typeof current)[]) {
			assert.ok(current[key] >= Math.min(before[key], target[key]));
			assert.ok(current[key] <= Math.max(before[key], target[key]));
			if (before[key] !== target[key]) assert.notEqual(current[key], target[key]);
		}
	}
	const settled = { ...current };
	for (let i = 0; i < 180; i++) stepStudyLighting(settled, STUDY_LIGHTING.reading, 1 / 60);
	assert.ok(settled.dust < 0.001 && Math.abs(settled.sun - STUDY_LIGHTING.reading.sun) < 0.001);

	const stepped = stepBackdropOpacity(0.24, 0.39, 8);
	assert.equal(stepped, stepBackdropOpacity(0.24, 0.39, 0.05));
	assert.ok(stepped > 0.24 && stepped < 0.39);
});

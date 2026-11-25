import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { layoutCatalogOnBookcase } from '#lib/catalog/layout.ts';
import {
	buildLeaningNeighborMap,
	createLeaningNeighborState,
	evaluateLeaningTransform,
	stepLeaningNeighbor
} from '#lib/physics/leaning-neighbor.ts';

const placedVolumes = layoutCatalogOnBookcase();
const neighborMap = buildLeaningNeighborMap(placedVolumes);
const aeneid = placedVolumes.find((v) => v.volume.id === 'aeneid')!;
const iliad = placedVolumes.find((v) => v.volume.id === 'iliad')!;

describe('leaning-neighbor domino-catch physics', () => {
	it('identifies The Aeneid as supported by The Odyssey and catching on The Iliad', () => {
		const support = neighborMap.get('aeneid');
		assert.ok(support, 'Expected aeneid in leaning neighbor map');
		assert.equal(support.supportVolumeId, 'the-odyssey');
		assert.equal(support.catchVolumeId, 'iliad');
		assert.equal(support.sign, 1);
		assert.ok(support.catchAngle > support.restingAngle);
		assert.ok(support.catchAngle < Math.PI / 2);
	});

	it('keeps the resting transform bit-for-bit identical to placed.position and flush on the Shelf', () => {
		const support = neighborMap.get('aeneid')!;
		const resting = evaluateLeaningTransform(
			aeneid,
			support.footX,
			support.surfaceY,
			support.sign,
			support.restingAngle
		);
		assert.ok(Math.abs(resting.pivot[0] - aeneid.position[0]) < 1e-9);
		assert.ok(Math.abs(resting.pivot[1] - aeneid.position[1]) < 1e-9);
		assert.ok(Math.abs(resting.pivot[2] - aeneid.position[2]) < 1e-9);
	});

	it('makes exact zero-clipping contact against The Iliad cover face at the catch angle', () => {
		const support = neighborMap.get('aeneid')!;
		const { height, thickness } = aeneid.volume.dimensions;
		const catchTransform = evaluateLeaningTransform(
			aeneid,
			support.footX,
			support.surfaceY,
			support.sign,
			support.catchAngle
		);

		// Compute the top-left corner of The Aeneid in world XY at the catch angle.
		const theta = catchTransform.rotationZ;
		const localTopLeftX = -thickness / 2;
		const localTopLeftY = height;
		const worldTopLeftX =
			catchTransform.pivot[0] + localTopLeftX * Math.cos(theta) - localTopLeftY * Math.sin(theta);
		const worldTopLeftY =
			catchTransform.pivot[1] + localTopLeftX * Math.sin(theta) + localTopLeftY * Math.cos(theta);

		const iliadRightFaceX = iliad.position[0] + iliad.volume.dimensions.thickness / 2;
		const iliadTopY = iliad.position[1] + iliad.volume.dimensions.height;

		// Top-left corner of The Aeneid meets The Iliad's right cover face exactly without penetrating.
		assert.ok(
			Math.abs(worldTopLeftX - iliadRightFaceX) < 1e-9,
			`Expected contact at ${iliadRightFaceX}, got ${worldTopLeftX}`
		);
		assert.ok(worldTopLeftY > support.surfaceY && worldTopLeftY <= iliadTopY);

		// Bottom-left corner stays planted flush on the Shelf surface.
		const localBottomLeftX = -thickness / 2;
		const worldBottomLeftY =
			catchTransform.pivot[1] + localBottomLeftX * Math.sin(theta);
		assert.ok(Math.abs(worldBottomLeftY - support.surfaceY) < 1e-9);
	});

	it('tips smoothly into catch contact when The Odyssey is pulled out and rights cleanly on return', () => {
		const support = neighborMap.get('aeneid')!;
		const state = createLeaningNeighborState(support.restingAngle);

		// Simulate pull-out: Aeneid tips under gravity and settles cleanly at catchAngle.
		for (let i = 0; i < 60; i++) {
			stepLeaningNeighbor(state, support, true, 0.025);
			assert.ok(
				state.angle <= support.catchAngle + 1e-9,
				'Tipping Volume must never clip past its catch angle'
			);
		}
		assert.equal(state.atCatch, true);
		assert.ok(Math.abs(state.angle - support.catchAngle) < 1e-6);
		assert.equal(state.angularVelocity, 0);

		// Simulate return: Aeneid smoothly rights back to its exact resting lean angle.
		for (let i = 0; i < 60; i++) {
			stepLeaningNeighbor(state, support, false, 0.025);
			assert.ok(
				state.angle >= support.restingAngle - 1e-9,
				'Righting Volume must never overshoot past its supporting Volume'
			);
		}
		assert.ok(Math.abs(state.angle - support.restingAngle) < 1e-6);
		assert.equal(state.angularVelocity, 0);
	});

	it('settles flat onto the Shelf (pi/2) when unobstructed', () => {
		// Synthetic unobstructed leaning Volume with no second neighbor behind its support.
		const soloLeaning = aeneid;
		const supportVolume = placedVolumes.find((v) => v.volume.id === 'the-odyssey')!;
		const map = buildLeaningNeighborMap([supportVolume, soloLeaning]);
		const support = map.get('aeneid')!;
		assert.ok(support);
		assert.equal(support.supportVolumeId, 'the-odyssey');
		assert.equal(support.catchVolumeId, null);
		assert.ok(Math.abs(support.catchAngle - Math.PI / 2) < 1e-9);
	});
});

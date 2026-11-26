import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getBookcaseStructure } from '#lib/catalog/bookcase.ts';
import { layoutCatalogOnBookcase } from '#lib/catalog/layout.ts';
import { computeVolumeShelfCenter } from '#lib/physics/inspect-volume.ts';
import {
	createShelfDominoSimulation,
	getBoxCorners,
	getShelfDominoPose,
	startShelfDomino,
	startShelfDominoReturn,
	stepShelfDomino
} from '#lib/physics/shelf-domino.ts';

const bookcase = getBookcaseStructure();
const placedVolumes = layoutCatalogOnBookcase();

function simulateSeconds(sim: ReturnType<typeof createShelfDominoSimulation>, seconds: number): void {
	const steps = Math.ceil(seconds / 0.02);
	for (let i = 0; i < steps; i++) {
		stepShelfDomino(sim, 0.02);
	}
}

describe('shelf-domino 2D multi-body physics', () => {
	it('tips The Aeneid cleanly onto The Iliad when The Odyssey is pulled out and rights it on return', () => {
		const sim = createShelfDominoSimulation(placedVolumes);
		const aeneid = placedVolumes.find((v) => v.volume.id === 'aeneid')!;
		const iliad = placedVolumes.find((v) => v.volume.id === 'iliad')!;
		const shelf = bookcase.shelves[aeneid.shelfIndex];

		startShelfDomino(sim, 'the-odyssey');
		simulateSeconds(sim, 1.4);

		const aeneidPose = getShelfDominoPose(sim, 'aeneid')!;
		const iliadPose = getShelfDominoPose(sim, 'iliad')!;
		assert.ok(aeneidPose, 'Expected live pose for aeneid');
		// Aeneid tipped significantly further leftward than its 14° (0.244 rad) resting lean
		assert.ok(
			aeneidPose.angle > aeneid.rotationZ + 0.18,
			`Expected Aeneid to tip further leftward, got ${aeneidPose.angle.toFixed(3)} rad`
		);

		// Verify zero Shelf floor penetration and zero clipping through The Iliad
		const corners = getBoxCorners(
			aeneidPose.centerX,
			aeneidPose.centerY,
			aeneidPose.angle,
			aeneid.volume.dimensions.thickness / 2,
			aeneid.volume.dimensions.height / 2
		);
		const minY = Math.min(...corners.map((c) => c.y));
		const minX = Math.min(...corners.map((c) => c.x));
		const iliadRightFace = iliadPose.centerX + iliad.volume.dimensions.thickness / 2;

		assert.ok(minY >= shelf.surfaceY - 0.002, `Aeneid sank below shelf: ${minY} < ${shelf.surfaceY}`);
		assert.ok(
			minX >= iliadRightFace - 0.004,
			`Aeneid clipped into The Iliad: minX=${minX.toFixed(4)} < iliadRight=${iliadRightFace.toFixed(4)}`
		);

		// Smooth return restores exact resting pose
		startShelfDominoReturn(sim);
		simulateSeconds(sim, 0.7);
		assert.equal(sim.phase, 'idle');
		const restored = getShelfDominoPose(sim, 'aeneid')!;
		const exactRest = computeVolumeShelfCenter(aeneid, 0);
		assert.ok(Math.abs(restored.centerX - exactRest[0]) < 1e-9);
		assert.ok(Math.abs(restored.centerY - exactRest[1]) < 1e-9);
		assert.ok(Math.abs(restored.angle - aeneid.rotationZ) < 1e-9);
	});

	it('produces a true multi-book domino chain when pulling out an interior book (The Iliad)', () => {
		const sim = createShelfDominoSimulation(placedVolumes);
		const odyssey = placedVolumes.find((v) => v.volume.id === 'the-odyssey')!;
		const aeneid = placedVolumes.find((v) => v.volume.id === 'aeneid')!;

		// Pulling out The Iliad (#3) lets leaning Aeneid (#5) push upright Odyssey (#4) leftward into the gap!
		startShelfDomino(sim, 'iliad');
		simulateSeconds(sim, 1.5);

		const odysseyPose = getShelfDominoPose(sim, 'the-odyssey')!;
		const aeneidPose = getShelfDominoPose(sim, 'aeneid')!;

		assert.ok(
			odysseyPose.angle > 0.12,
			`Expected upright Odyssey (#4) to domino-tip leftward when Iliad (#3) is removed, got ${odysseyPose.angle.toFixed(3)} rad`
		);
		assert.ok(
			aeneidPose.angle > aeneid.rotationZ + 0.08,
			`Expected Aeneid (#5) to follow Odyssey in the domino chain, got ${aeneidPose.angle.toFixed(3)} rad`
		);
		assert.ok(odysseyPose.centerX < computeVolumeShelfCenter(odyssey, 0)[0]);
	});

	it('gently tips the heavier adjacent neighbor into the gap in an all-upright row (Essays)', () => {
		const sim = createShelfDominoSimulation(placedVolumes);
		// Shelf 2 right: Meditations, Letters, Enchiridion (lighter), Essays (removed), Pensées (heavier), Ethics
		startShelfDomino(sim, 'essays-montaigne');
		simulateSeconds(sim, 1.4);

		const penseesPose = getShelfDominoPose(sim, 'pensees')!;
		assert.ok(
			penseesPose.angle > 0.12,
			`Expected heavier neighbor Pensées to tip leftward into Essays gap, got ${penseesPose.angle.toFixed(3)} rad`
		);
	});

	it('catches and stays rock-solid without slow foot-creep when pulling out The Divine Comedy', () => {
		const sim = createShelfDominoSimulation(placedVolumes);
		startShelfDomino(sim, 'divine-comedy');

		simulateSeconds(sim, 1.8);
		const paradiseAt18 = { ...getShelfDominoPose(sim, 'paradise-lost')! };
		const metaAt18 = { ...getShelfDominoPose(sim, 'metamorphoses')! };

		// Both neighbors should have domino-tipped leftward and caught at a realistic lean angle (not flat!)
		assert.ok(paradiseAt18.angle > 0.12 && paradiseAt18.angle < 1.0, `Unexpected paradise-lost angle: ${paradiseAt18.angle}`);
		assert.ok(metaAt18.angle > 0.25 && metaAt18.angle < 1.1, `Unexpected metamorphoses angle: ${metaAt18.angle}`);

		// Simulate 2.5 more seconds and verify zero slow creep / collapse
		simulateSeconds(sim, 2.5);
		const paradiseAt43 = getShelfDominoPose(sim, 'paradise-lost')!;
		const metaAt43 = getShelfDominoPose(sim, 'metamorphoses')!;

		assert.ok(
			Math.abs(paradiseAt43.angle - paradiseAt18.angle) < 0.015,
			`paradise-lost kept creeping: ${paradiseAt18.angle.toFixed(3)} -> ${paradiseAt43.angle.toFixed(3)}`
		);
		assert.ok(
			Math.abs(metaAt43.angle - metaAt18.angle) < 0.015,
			`metamorphoses kept creeping: ${metaAt18.angle.toFixed(3)} -> ${metaAt43.angle.toFixed(3)}`
		);
		assert.equal(sim.isSettled, true, 'Expected Shelf domino stack to settle cleanly to sleep');
	});

	it('keeps every Volume inside the Bookcase walls and above the Shelf floor across every Shelf', () => {
		const shelf = bookcase.shelves[2];
		const sim = createShelfDominoSimulation(placedVolumes);
		startShelfDomino(sim, 'iliad');
		simulateSeconds(sim, 1.4);

		for (const placed of placedVolumes.filter((v) => v.shelfIndex === 2 && v.volume.id !== 'iliad')) {
			const pose = getShelfDominoPose(sim, placed.volume.id)!;
			const corners = getBoxCorners(
				pose.centerX,
				pose.centerY,
				pose.angle,
				placed.volume.dimensions.thickness / 2,
				placed.volume.dimensions.height / 2
			);
			for (const c of corners) {
				assert.ok(c.y >= shelf.surfaceY - 0.0025, `${placed.volume.id} dropped below shelf`);
				assert.ok(c.x >= bookcase.bounds.innerMinX - 0.0025, `${placed.volume.id} clipped left wall`);
				assert.ok(c.x <= bookcase.bounds.innerMaxX + 0.0025, `${placed.volume.id} clipped right wall`);
			}
		}
	});
});

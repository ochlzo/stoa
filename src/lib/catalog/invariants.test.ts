import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	BOOKCASE_DIMENSIONS,
	getBookcaseStructure,
	getShelfSurfaceY,
	ROOM_BACKDROP_DIMENSIONS
} from '#lib/catalog/bookcase.ts';
import {
	getVolumeGeometryParts,
	layoutCatalogOnBookcase,
	VOLUME_LAYOUT_CONSTANTS
} from '#lib/catalog/layout.ts';
import {
	getFramePivotY,
	getSculptureCenterY,
	layoutBookStack,
	sculptureTilt,
	STACK_COVER_THICKNESS,
	STACK_SPINE_DEPTH
} from '#lib/catalog/prop-layout.ts';
import { SHELF_PROP_FINISHES, SHELF_PROP_MATERIALS } from '#lib/catalog/shelf-prop-materials.ts';
import { getShelfProps } from '#lib/catalog/props.ts';
import type { PlacedVolume } from '#lib/catalog/types.ts';
import { CATALOG } from '#lib/catalog/volumes.ts';

it('defines a material for each Shelf Prop family and stack topper', () => {
	for (const prop of getShelfProps()) {
		const roles = SHELF_PROP_MATERIALS[prop.kind];
		assert.ok(roles, prop.id);
		for (const name of Object.values(roles).flat()) {
			assert.ok(Object.hasOwn(SHELF_PROP_FINISHES, name), prop.id + ' uses ' + name);
		}
		if (prop.kind === 'book-stack' && prop.topper) {
			assert.ok(SHELF_PROP_MATERIALS['book-stack'][prop.topper.profile]);
		}
	}
});

it('assigns different cover colors to neighboring Volumes on every Shelf', () => {
	const placed = layoutCatalogOnBookcase();
	for (let shelf = 0; shelf < BOOKCASE_DIMENSIONS.shelfCount; shelf++) {
		const row = placed.filter((item) => item.shelfIndex === shelf).sort((a, b) => a.position[0] - b.position[0]);
		for (let i = 1; i < row.length; i++) {
			const previous = row[i - 1].volume;
			const current = row[i].volume;
			assert.notEqual(current.coverColor, previous.coverColor, previous.title + ' beside ' + current.title);
		}
	}
});

const EPS = 1e-4; // 0.1 mm tolerance

/** Returns the 4 local XY corners of a Volume rotated and translated into Shelf world XY. */
function volumeCornersXY(placed: PlacedVolume): Array<[x: number, y: number]> {
	const { thickness, height } = placed.volume.dimensions;
	const [px, py] = placed.position;
	const cos = Math.cos(placed.rotationZ);
	const sin = Math.sin(placed.rotationZ);
	const localCorners: Array<[number, number]> = [
		[-thickness / 2, 0],
		[thickness / 2, 0],
		[thickness / 2, height],
		[-thickness / 2, height]
	];
	return localCorners.map(([lx, ly]) => [px + lx * cos - ly * sin, py + lx * sin + ly * cos]);
}

describe('Bookcase & RoomBackdrop structural invariants', () => {
	const bookcase = getBookcaseStructure();

	it('places plinth flush on the floor at y = 0', () => {
		const plinthMinY = bookcase.plinth.position[1] - bookcase.plinth.size[1] / 2;
		assert.ok(Math.abs(plinthMinY) < EPS, `Expected plinth minY = 0, got ${plinthMinY}`);
	});

	it('matches getShelfSurfaceY with every ShelfSpec', () => {
		for (const shelf of bookcase.shelves) {
			assert.ok(
				Math.abs(shelf.surfaceY - getShelfSurfaceY(shelf.index)) < EPS,
				`Shelf ${shelf.index} surfaceY mismatch`
			);
			const boardTopY = shelf.board.position[1] + shelf.board.size[1] / 2;
			assert.ok(
				Math.abs(boardTopY - shelf.surfaceY) < EPS,
				`Shelf ${shelf.index} board top ${boardTopY} != surfaceY ${shelf.surfaceY}`
			);
		}
	});

	it('places RoomBackdrop wall behind Bookcase and baseboard', () => {
		const wallZ = -(
			BOOKCASE_DIMENSIONS.depth +
			ROOM_BACKDROP_DIMENSIONS.baseboardDepth +
			ROOM_BACKDROP_DIMENSIONS.wallOffsetBehindBookcase
		);
		const baseboardFrontZ = wallZ + ROOM_BACKDROP_DIMENSIONS.baseboardDepth;
		assert.ok(
			baseboardFrontZ <= bookcase.bounds.minZ,
			`Baseboard front (${baseboardFrontZ}) clips into Bookcase back (${bookcase.bounds.minZ})`
		);
	});

	it('keeps all Bookcase architectural trim within bounds and flush with structural joints', () => {
		assert.ok(bookcase.trimParts.length > 0, 'Expected Bookcase trimParts to be populated');
		const crownTopY = bookcase.crown.position[1] + bookcase.crown.size[1] / 2;
		assert.ok(
			Math.abs(crownTopY - bookcase.bounds.maxY) < EPS,
			`Crown top (${crownTopY}) != bounds.maxY (${bookcase.bounds.maxY})`
		);
		for (const part of bookcase.trimParts) {
			const minX = part.position[0] - part.size[0] / 2;
			const maxX = part.position[0] + part.size[0] / 2;
			const minY = part.position[1] - part.size[1] / 2;
			const maxY = part.position[1] + part.size[1] / 2;
			const minZ = part.position[2] - part.size[2] / 2;
			const maxZ = part.position[2] + part.size[2] / 2;

			assert.ok(
				minX >= bookcase.bounds.minX - EPS && maxX <= bookcase.bounds.maxX + EPS,
				`${part.id} X [${minX}, ${maxX}] escapes Bookcase bounds`
			);
			assert.ok(
				minY >= bookcase.bounds.minY - EPS && maxY <= bookcase.bounds.maxY + EPS,
				`${part.id} Y [${minY}, ${maxY}] escapes Bookcase bounds`
			);
			assert.ok(
				minZ >= bookcase.bounds.minZ - EPS && maxZ <= bookcase.bounds.maxZ + EPS,
				`${part.id} Z [${minZ}, ${maxZ}] escapes Bookcase bounds`
			);
		}
	});
});

describe('Catalog & Volume placement invariants', () => {
	const bookcase = getBookcaseStructure();
	const placed = layoutCatalogOnBookcase(CATALOG);

	it('assigns unique IDs and fits every Volume within Shelf clearance and depth', () => {
		const ids = new Set<string>();
		for (const volume of CATALOG) {
			assert.ok(!ids.has(volume.id), `Duplicate Volume id: ${volume.id}`);
			ids.add(volume.id);

			const shelf = bookcase.shelves[volume.shelfIndex];
			assert.ok(shelf, `Invalid shelfIndex ${volume.shelfIndex} on ${volume.id}`);
			assert.ok(
				volume.dimensions.height < shelf.clearance,
				`${volume.id} height (${volume.dimensions.height}) exceeds clearance (${shelf.clearance})`
			);
			assert.ok(
				volume.dimensions.depth < shelf.innerDepth,
				`${volume.id} depth (${volume.dimensions.depth}) exceeds innerDepth (${shelf.innerDepth})`
			);
		}
	});

	it('rests every Volume flush on its Shelf surface and within side panels', () => {
		for (const item of placed) {
			const shelf = bookcase.shelves[item.shelfIndex];
			const corners = volumeCornersXY(item);
			const minY = Math.min(...corners.map(([, y]) => y));
			const maxY = Math.max(...corners.map(([, y]) => y));
			const minX = Math.min(...corners.map(([x]) => x));
			const maxX = Math.max(...corners.map(([x]) => x));

			assert.ok(
				Math.abs(minY - shelf.surfaceY) < EPS,
				`${item.volume.id} minY (${minY.toFixed(5)}) != shelf ${shelf.index} surfaceY (${shelf.surfaceY.toFixed(5)})`
			);
			assert.ok(
				maxY < shelf.surfaceY + shelf.clearance,
				`${item.volume.id} top (${maxY.toFixed(4)}) hits shelf board above`
			);
			assert.ok(
				minX >= bookcase.bounds.innerMinX - EPS && maxX <= bookcase.bounds.innerMaxX + EPS,
				`${item.volume.id} X [${minX.toFixed(4)}, ${maxX.toFixed(4)}] escapes Bookcase interior`
			);
			assert.ok(
				item.position[2] <= 0 && item.position[2] - item.volume.dimensions.depth >= -shelf.innerDepth,
				`${item.volume.id} Z range escapes Shelf depth`
			);
		}
	});

	it('makes exact contact for every leaning Volume against its supporting neighbor', () => {
		for (const shelf of bookcase.shelves) {
			const shelfItems = placed.filter((item) => item.shelfIndex === shelf.index);
			const leftCluster = shelfItems.filter((item) => item.volume.placement.anchor === 'left');
			const rightCluster = shelfItems.filter((item) => item.volume.placement.anchor === 'right');

			// Check non-overlap between left and right clusters
			if (leftCluster.length > 0 && rightCluster.length > 0) {
				const leftMaxX = Math.max(...leftCluster.flatMap((v) => volumeCornersXY(v).map(([x]) => x)));
				const rightMinX = Math.min(
					...rightCluster.flatMap((v) => volumeCornersXY(v).map(([x]) => x))
				);
				assert.ok(
					leftMaxX < rightMinX,
					`Shelf ${shelf.index} left cluster (${leftMaxX.toFixed(4)}) overlaps right cluster (${rightMinX.toFixed(4)})`
				);
			}

			// Verify contact within each cluster (walked from outer panel inward, matching packCluster)
			for (const [cluster, direction] of [
				[leftCluster, 1],
				[rightCluster, -1]
			] as const) {
				for (let i = 1; i < cluster.length; i += 1) {
					const support = cluster[i - 1];
					const current = cluster[i];
					const lean = current.rotationZ;
					const supportEdgeX =
						support.position[0] +
						direction * (support.volume.dimensions.thickness / 2) * Math.cos(Math.abs(support.rotationZ));

					if (lean === 0) {
						const currentEdgeX = current.position[0] - direction * (current.volume.dimensions.thickness / 2);
						const gap = (currentEdgeX - supportEdgeX) * direction;
						assert.ok(
							gap >= VOLUME_LAYOUT_CONSTANTS.minGap - EPS,
							`${current.volume.id} overlaps or crowds ${support.volume.id} (gap ${(gap * 1000).toFixed(2)} mm)`
						);
					} else {
						// Compute horizontal distance from the leaning cover line to the support's upper contact point
						const angle = Math.abs(lean);
						const contactHeight = Math.min(
							current.volume.dimensions.height * Math.cos(angle),
							support.volume.dimensions.height
						);
						const localCoverX = -direction * (current.volume.dimensions.thickness / 2);
						const localCoverY = Math.min(
							current.volume.dimensions.height,
							contactHeight / Math.cos(angle)
						);
						const contactWorldX =
							current.position[0] +
							localCoverX * Math.cos(lean) -
							localCoverY * Math.sin(lean);
						const gap = (contactWorldX - supportEdgeX) * direction;

						assert.ok(
							Math.abs(gap) < EPS,
							`${current.volume.id} lean contact gap against ${support.volume.id} is ${(gap * 1000).toFixed(2)} mm (expected 0 mm)`
						);
					}
				}
			}
		}
	});

	it('builds valid non-overlapping Volume geometry and Binding Style trim for every Catalog entry', () => {
		for (const volume of CATALOG) {
			const parts = getVolumeGeometryParts(
				volume.dimensions,
				volume.spineProfile,
				volume.bindingStyle
			);
			assert.ok(parts.pageBlock.size[0] > 0, `${volume.id} pageWidth <= 0`);
			assert.ok(parts.pageBlock.size[1] > 0, `${volume.id} pageHeight <= 0`);
			assert.ok(parts.pageBlock.size[2] > 0, `${volume.id} pageDepth <= 0`);
			assert.ok(parts.frontBoard.size[2] > 0, `${volume.id} boardDepth <= 0`);

			for (const band of parts.spineBands) {
				assert.ok(
					band.position[1] - band.height / 2 >= 0 &&
						band.position[1] + band.height / 2 <= volume.dimensions.height,
					`${volume.id} ${band.id} escapes Volume height`
				);
				assert.ok(
					band.size[0] <= volume.dimensions.thickness + EPS,
					`${volume.id} ${band.id} widens past Volume thickness`
				);
			}

			for (const headband of parts.headbands) {
				assert.ok(
					headband.position[1] - headband.radius >= -EPS &&
						headband.position[1] + headband.radius <= volume.dimensions.height + EPS,
					`${volume.id} ${headband.id} pokes outside Volume cover height`
				);
				assert.ok(
					headband.width <= parts.pageBlock.size[0] + EPS,
					`${volume.id} ${headband.id} clips cover boards`
				);
			}
		}
	});
});

describe('Shelf Prop placement invariants', () => {
	const bookcase = getBookcaseStructure();
	const props = getShelfProps();

	it('assigns unique IDs and rests every prop at its Shelf surfaceY', () => {
		const ids = new Set<string>();
		for (const prop of props) {
			assert.ok(!ids.has(prop.id), `Duplicate Shelf Prop id: ${prop.id}`);
			ids.add(prop.id);

			const shelf = bookcase.shelves[prop.shelfIndex];
			assert.ok(shelf, `Invalid shelfIndex ${prop.shelfIndex} on ${prop.id}`);
			assert.ok(
				Math.abs(prop.position[1] - shelf.surfaceY) < EPS,
				`${prop.id} y (${prop.position[1]}) != shelf ${shelf.index} surfaceY (${shelf.surfaceY})`
			);
		}
	});

	it('places every icosahedron sculpture flush on its Shelf without clipping', () => {
		const phi = (1 + Math.sqrt(5)) / 2;
		const norm = Math.hypot(1, phi);
		const rawVertices: Array<[number, number, number]> = [
			[-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
			[0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
			[phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
		];

		for (const prop of props) {
			if (prop.kind !== 'sculpture') continue;
			const surfaceY = getShelfSurfaceY(prop.shelfIndex);
			const centerY = getSculptureCenterY(surfaceY, prop.radius);

			const cos = Math.cos(sculptureTilt);
			const sin = Math.sin(sculptureTilt);
			const minY = Math.min(
				...rawVertices.map(([, y, z]) => {
					const ny = (y / norm) * prop.radius;
					const nz = (z / norm) * prop.radius;
					return centerY + ny * cos - nz * sin;
				})
			);

			assert.ok(
				Math.abs(minY - surfaceY) < EPS,
				`${prop.id} lowest vertex (${minY.toFixed(5)}) != shelf surfaceY (${surfaceY.toFixed(5)})`
			);
		}
	});

	it('places every leaning frame flush on its Shelf and clear of the back panel', () => {
		for (const prop of props) {
			if (prop.kind !== 'frame') continue;
			const shelf = bookcase.shelves[prop.shelfIndex];
			const pivotY = getFramePivotY(prop);
			const cos = Math.cos(prop.tiltX);
			const sin = Math.sin(prop.tiltX);
			const localYZ: Array<[number, number]> = [
				[0, -prop.thickness / 2],
				[0, prop.thickness / 2],
				[prop.height, -prop.thickness / 2],
				[prop.height, prop.thickness / 2]
			];
			const worldYs = localYZ.map(([y, z]) => pivotY + y * cos - z * sin);
			const worldZs = localYZ.map(([y, z]) => prop.position[2] + y * sin + z * cos);

			assert.ok(
				Math.abs(Math.min(...worldYs) - shelf.surfaceY) < EPS,
				`${prop.id} lowest corner does not rest on shelf surfaceY`
			);
			assert.ok(
				Math.min(...worldZs) >= -shelf.innerDepth - EPS,
				`${prop.id} clips through Bookcase back panel (minZ ${Math.min(...worldZs).toFixed(4)} < ${-shelf.innerDepth})`
			);
		}
	});

	it('stacks decorative books with zero inter-book gaps and non-overlapping covers/spines', () => {
		for (const prop of props) {
			if (prop.kind !== 'book-stack') continue;
			const { layers, topY } = layoutBookStack(prop.books);
			assert.ok(layers.length > 0, `${prop.id} has no books`);

			let expectedBottom = 0;
			for (const { book, centerY } of layers) {
				const bottom = centerY - book.thickness / 2;
				const top = centerY + book.thickness / 2;
				assert.ok(
					Math.abs(bottom - expectedBottom) < EPS,
					`${prop.id} stack gap/overlap of ${((bottom - expectedBottom) * 1000).toFixed(2)} mm`
				);
				assert.ok(
					book.thickness - STACK_COVER_THICKNESS * 2 > 0,
					`${prop.id} stacked book too thin for covers`
				);
				assert.ok(
					book.depth - STACK_SPINE_DEPTH > 0,
					`${prop.id} stacked book too shallow for spine`
				);
				expectedBottom = top;
			}
			assert.ok(Math.abs(topY - expectedBottom) < EPS, `${prop.id} topY mismatch`);
		}
	});
});

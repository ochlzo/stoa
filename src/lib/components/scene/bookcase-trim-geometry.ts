import * as THREE from 'three';
import { BOOKCASE_DIMENSIONS } from '#lib/catalog/bookcase.ts';
import { WOOD_GRAIN_TILE_WIDTH } from '#lib/catalog/lookdev.ts';

export interface BookcaseCrownGeometryBundle {
	readonly geometry: THREE.BufferGeometry;
	readonly dispose: () => void;
}

interface ProfilePoint {
	/** Height above the top of the Bookcase body (meters). */
	readonly y: number;
	/** Outward projection past the Bookcase front and side planes (meters). */
	readonly out: number;
}

/**
 * Generates a classical library crown molding profile:
 * flush frieze -> crisp lower bead -> smooth concave/ogee flare -> crisp top fascia.
 */
function buildCrownProfile(height: number, overhang: number): ProfilePoint[] {
	const points: ProfilePoint[] = [
		// 1. Flush vertical frieze (bottom 38% of crown height)
		{ y: 0, out: 0 },
		{ y: height * 0.36, out: 0 },
		// 2. Small lower fillet / bed step creating a crisp shadow line
		{ y: height * 0.38, out: overhang * 0.18 },
		{ y: height * 0.44, out: overhang * 0.22 }
	];

	// 3. Smooth classical cyma / cove curve flaring outward to the top fascia
	const curveStartY = height * 0.44;
	const curveEndY = height * 0.84;
	const curveStartOut = overhang * 0.22;
	const curveEndOut = overhang * 0.96;
	const curveSteps = 10;

	for (let i = 1; i <= curveSteps; i += 1) {
		const t = i / curveSteps;
		// Smooth S-curve (cyma recta) with gentle concave sweep into convex upper lip
		const s = t * t * (3 - 2 * t);
		const coveBias = Math.pow(t, 1.35) * 0.35 + s * 0.65;
		points.push({
			y: curveStartY + (curveEndY - curveStartY) * t,
			out: curveStartOut + (curveEndOut - curveStartOut) * coveBias
		});
	}

	// 4. Crisp vertical top cornice cap / fascia
	points.push(
		{ y: height * 0.85, out: overhang },
		{ y: height, out: overhang }
	);

	return points;
}

/**
 * Builds a mitered 3-sided (left return, front, right return) classical crown molding
 * geometry in local coordinates with y = 0 at the base of the crown.
 *
 * Separate strips per side preserve crisp 45-degree miter corners while shading
 * the vertical cove/ogee smoothly. Call dispose() on teardown.
 */
export function createBookcaseCrownGeometry(): BookcaseCrownGeometryBundle {
	const d = BOOKCASE_DIMENSIONS;
	const halfW = d.innerWidth / 2 + d.sidePanelThickness;
	const depth = d.depth;
	const profile = buildCrownProfile(d.crownHeight, d.crownOverhang);

	const positions: number[] = [];
	const uvs: number[] = [];
	const indices: number[] = [];

	/**
	 * Appends one smooth-shaded strip swept along the profile between two corner generators.
	 */
	function addSideStrip(
		startCorner: (p: ProfilePoint) => readonly [number, number, number],
		endCorner: (p: ProfilePoint) => readonly [number, number, number]
	): void {
		const baseIndex = positions.length / 3;
		let distance = 0;
		let previous = profile[0];
		for (const p of profile) {
			const a = startCorner(p);
			const b = endCorner(p);
			distance += Math.hypot(p.y - previous.y, p.out - previous.out);
			previous = p;
			const front = a[2] === b[2];
			uvs.push(
				front ? a[0] : a[2],
				distance / WOOD_GRAIN_TILE_WIDTH,
				front ? b[0] : b[2],
				distance / WOOD_GRAIN_TILE_WIDTH
			);
			positions.push(a[0], a[1], a[2], b[0], b[1], b[2]);
		}
		for (let i = 0; i < profile.length - 1; i += 1) {
			const row = baseIndex + i * 2;
			const next = row + 2;
			indices.push(row, row + 1, next + 1, row, next + 1, next);
		}
	}

	// Front face: left miter -> right miter (outward normal faces +Z/+Y)
	addSideStrip(
		(p) => [-halfW - p.out, p.y, p.out],
		(p) => [halfW + p.out, p.y, p.out]
	);

	// Left return: back-left -> front-left miter (outward normal faces -X/+Y)
	addSideStrip(
		(p) => [-halfW - p.out, p.y, -depth],
		(p) => [-halfW - p.out, p.y, p.out]
	);

	// Right return: front-right miter -> back-right (outward normal faces +X/+Y)
	addSideStrip(
		(p) => [halfW + p.out, p.y, p.out],
		(p) => [halfW + p.out, p.y, -depth]
	);

	// Flat top cap closing the crown at y = crownHeight
	const top = profile[profile.length - 1];
	const capBase = positions.length / 3;
	positions.push(
		-halfW - top.out, top.y, -depth,
		-halfW - top.out, top.y, top.out,
		halfW + top.out, top.y, top.out,
		halfW + top.out, top.y, -depth
	);
	uvs.push(
		-halfW - top.out,
		-depth / WOOD_GRAIN_TILE_WIDTH,
		-halfW - top.out,
		top.out / WOOD_GRAIN_TILE_WIDTH,
		halfW + top.out,
		top.out / WOOD_GRAIN_TILE_WIDTH,
		halfW + top.out,
		-depth / WOOD_GRAIN_TILE_WIDTH
	);
	indices.push(capBase, capBase + 1, capBase + 2, capBase, capBase + 2, capBase + 3);

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
	geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
	geometry.setIndex(indices);
	geometry.computeVertexNormals();

	return {
		geometry,
		dispose: () => {
			geometry.dispose();
		}
	};
}

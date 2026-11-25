import * as THREE from 'three';
import type { ShelfPropSpec, VaseProfile } from '#lib/catalog/props.ts';

const VASE_PROFILES: Record<VaseProfile, readonly [radius: number, y: number][]> = {
	amphora: [
		[0.0, 0.0],
		[0.036, 0.0],
		[0.044, 0.02],
		[0.068, 0.075],
		[0.064, 0.125],
		[0.032, 0.165],
		[0.028, 0.195],
		[0.04, 0.215],
		[0.034, 0.215],
		[0.024, 0.19],
		[0.0, 0.16]
	],
	belly: [
		[0.0, 0.0],
		[0.048, 0.0],
		[0.078, 0.045],
		[0.084, 0.095],
		[0.064, 0.14],
		[0.036, 0.165],
		[0.042, 0.18],
		[0.036, 0.18],
		[0.028, 0.155],
		[0.0, 0.13]
	],
	bowl: [
		[0.0, 0.0],
		[0.042, 0.0],
		[0.072, 0.018],
		[0.096, 0.048],
		[0.102, 0.072],
		[0.094, 0.072],
		[0.084, 0.046],
		[0.046, 0.014],
		[0.0, 0.012]
	]
};

const OUTER_WALL_END: Record<VaseProfile, number> = {
	amphora: 7,
	belly: 6,
	bowl: 4
};

function createSmoothLathe(
	points: readonly [number, number][],
	outerWallEnd: number,
	segments = 40
): THREE.LatheGeometry {
	const vecs = points.map(([r, y]) => new THREE.Vector2(r, y));
	const outerWall = new THREE.SplineCurve(vecs.slice(1, outerWallEnd + 1)).getPoints(
		outerWallEnd * 6
	);
	return new THREE.LatheGeometry([vecs[0], ...outerWall, ...vecs.slice(outerWallEnd + 1)], segments);
}

/**
 * Sculpted pointed-oval leaf blade with a gentle lengthwise arch (origin at petiole base,
 * extends along +Y so rotations around X/Z orient the leaf cleanly along any stem).
 */
function createCurvedLeafGeometry(
	length: number,
	halfWidth: number,
	thickness: number,
	arch: number
): THREE.ExtrudeGeometry {
	const shape = new THREE.Shape();
	shape.moveTo(0, 0);
	shape.bezierCurveTo(halfWidth * 0.9, length * 0.18, halfWidth * 1.15, length * 0.62, 0, length);
	shape.bezierCurveTo(
		-halfWidth * 1.15,
		length * 0.62,
		-halfWidth * 0.9,
		length * 0.18,
		0,
		0
	);

	const geom = new THREE.ExtrudeGeometry(shape, {
		depth: thickness,
		bevelEnabled: true,
		bevelThickness: thickness * 0.45,
		bevelSize: thickness * 0.35,
		bevelSegments: 2,
		curveSegments: 10
	});

	// Gently cup and arch the blade along its length so it reads as living foliage, not cardboard
	const pos = geom.attributes.position;
	for (let i = 0; i < pos.count; i += 1) {
		const x = pos.getX(i);
		const y = pos.getY(i);
		const z = pos.getZ(i);
		const t = Math.max(0, y / length);
		const bend = -arch * t * t;
		const cup = Math.abs(x / halfWidth) * thickness * 1.2;
		pos.setZ(i, z - thickness / 2 + bend + cup);
	}
	geom.computeVertexNormals();
	return geom;
}

interface StemLeafPlacement {
	readonly key: string;
	readonly position: readonly [number, number, number];
	readonly rotation: readonly [number, number, number];
	readonly scale: number;
}

interface TrailingPlantBuild {
	readonly stemGeometries: readonly THREE.TubeGeometry[];
	readonly leaves: readonly StemLeafPlacement[];
}

/**
 * Builds curved arching stems (Catmull-Rom TubeGeometry) and paired sculpted leaves
 * for a trailing/arching houseplant (pothos-inspired, with a couple sprigs spilling gently over the rim).
 */
function buildTrailingPlant(potRadius: number, potHeight: number): TrailingPlantBuild {
	const stemSpecs = [
		// Three upright arching crown stems
		{ azimuth: 0.3, reach: potRadius * 1.15, peakY: 0.115, tipY: 0.088, tipDrop: false },
		{ azimuth: 2.35, reach: potRadius * 1.05, peakY: 0.125, tipY: 0.102, tipDrop: false },
		{ azimuth: 4.35, reach: potRadius * 1.1, peakY: 0.108, tipY: 0.082, tipDrop: false },
		// Four graceful outer stems arching out and slightly over the stoneware rim
		{ azimuth: 1.25, reach: potRadius * 1.55, peakY: 0.072, tipY: 0.008, tipDrop: true },
		{ azimuth: 3.35, reach: potRadius * 1.48, peakY: 0.068, tipY: 0.014, tipDrop: true },
		{ azimuth: 5.35, reach: potRadius * 1.62, peakY: 0.062, tipY: -0.022, tipDrop: true },
		{ azimuth: -0.55, reach: potRadius * 1.45, peakY: 0.078, tipY: 0.022, tipDrop: true }
	] as const;

	const soilY = potHeight * 0.86;
	const stemGeometries: THREE.TubeGeometry[] = [];
	const leaves: StemLeafPlacement[] = [];

	stemSpecs.forEach((spec, sIdx) => {
		const dirX = Math.cos(spec.azimuth);
		const dirZ = Math.sin(spec.azimuth);
		const startR = potRadius * 0.18;

		const p0 = new THREE.Vector3(dirX * startR, soilY, dirZ * startR);
		const p1 = new THREE.Vector3(dirX * spec.reach * 0.36, soilY + spec.peakY * 0.82, dirZ * spec.reach * 0.36);
		const p2 = new THREE.Vector3(dirX * spec.reach * 0.76, soilY + spec.peakY, dirZ * spec.reach * 0.76);
		const p3 = new THREE.Vector3(dirX * spec.reach, soilY + spec.tipY, dirZ * spec.reach);

		const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3]);
		stemGeometries.push(new THREE.TubeGeometry(curve, 14, 0.0022, 6, false));

		const leafFractions = spec.tipDrop ? [0.42, 0.68, 0.9, 1.0] : [0.48, 0.76, 1.0];
		leafFractions.forEach((t, lIdx) => {
			const pt = curve.getPoint(t);
			const isTip = t >= 0.99;
			const sideSign = isTip ? 0 : lIdx % 2 === 0 ? 1 : -1;
			const yaw = -spec.azimuth + Math.PI / 2 + sideSign * 0.55;
			const pitch = spec.tipDrop ? 0.85 + t * 0.65 : 0.42 + t * 0.55;
			const scale = isTip ? 0.78 : 0.88 + (1 - t) * 0.25;

			leaves.push({
				key: `stem-${sIdx}-leaf-${lIdx}`,
				position: [pt.x, pt.y, pt.z],
				rotation: [pitch, yaw, sideSign * 0.25],
				scale
			});
		});
	});

	return { stemGeometries, leaves };
}

export function createShelfPropGeometry(props: readonly ShelfPropSpec[]) {
	const vaseGeometries: Record<VaseProfile, THREE.LatheGeometry> = {
		amphora: createSmoothLathe(VASE_PROFILES.amphora, OUTER_WALL_END.amphora),
		belly: createSmoothLathe(VASE_PROFILES.belly, OUTER_WALL_END.belly),
		bowl: createSmoothLathe(VASE_PROFILES.bowl, OUTER_WALL_END.bowl)
	};

	// Rounded ceramic planter pot with a gentle belly and rolled rim (normalized radius 1, height 1)
	const planterPotGeometry = createSmoothLathe(
		[
			[0.0, 0.0],
			[0.72, 0.0],
			[0.86, 0.18],
			[1.0, 0.54],
			[0.98, 0.88],
			[1.02, 0.96],
			[0.96, 1.0],
			[0.88, 0.96],
			[0.86, 0.84],
			[0.0, 0.84]
		],
		6,
		36
	);

	// Organic foliage leaf (pothos/trailing houseplant) & plump spoon petal (echeveria succulent)
	const foliageLeafGeometry = createCurvedLeafGeometry(0.044, 0.017, 0.0018, 0.011);
	const succulentPetalGeometry = createCurvedLeafGeometry(0.032, 0.014, 0.0045, 0.007);

	// Smooth pinched double-bulb hourglass vessel normalized to height 1.0, radius 1.0
	const hourglassBulbGeometry = createSmoothLathe(
		[
			[0.0, 0.0],
			[0.58, 0.0],
			[0.72, 0.16],
			[0.54, 0.34],
			[0.14, 0.5],
			[0.54, 0.66],
			[0.72, 0.84],
			[0.58, 1.0],
			[0.0, 1.0]
		],
		7,
		32
	);

	// Turned classical candlestick pedestal normalized to height 1.0, base radius 1.0
	const candlestickHolderGeometry = createSmoothLathe(
		[
			[0.0, 0.0],
			[1.0, 0.0],
			[0.92, 0.08],
			[0.56, 0.18],
			[0.28, 0.34],
			[0.38, 0.52],
			[0.24, 0.72],
			[0.44, 0.88],
			[0.64, 0.96],
			[0.56, 1.0],
			[0.34, 0.94],
			[0.0, 0.92]
		],
		9,
		32
	);

	const trailingPlants = new Map<string, TrailingPlantBuild>();
	for (const prop of props) {
		if (prop.kind === 'planter' && prop.leafStyle === 'tall') {
			trailingPlants.set(prop.id, buildTrailingPlant(prop.potRadius, prop.potHeight));
		}
	}

	function dispose() {
		for (const geom of Object.values(vaseGeometries)) {
			geom.dispose();
		}
		planterPotGeometry.dispose();
		foliageLeafGeometry.dispose();
		succulentPetalGeometry.dispose();
		hourglassBulbGeometry.dispose();
		candlestickHolderGeometry.dispose();
		for (const plant of trailingPlants.values()) {
			for (const stemGeom of plant.stemGeometries) {
				stemGeom.dispose();
			}
		}
	}

	return {
		vaseGeometries, planterPotGeometry, foliageLeafGeometry, succulentPetalGeometry,
		hourglassBulbGeometry, candlestickHolderGeometry, trailingPlants, dispose
	};
}

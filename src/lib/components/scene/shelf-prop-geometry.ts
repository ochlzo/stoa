import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rosettePetals } from '#lib/catalog/prop-layout.ts';
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
	segments = 24
): THREE.LatheGeometry {
	const vecs = points.map(([r, y]) => new THREE.Vector2(r, y));
	const outerWall = new THREE.SplineCurve(vecs.slice(1, outerWallEnd + 1)).getPoints(
		outerWallEnd * 4
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
		bevelSegments: 1,
		curveSegments: 6
	});

	// Gently cup and arch the blade along its length so it reads as living foliage, not cardboard
	const pos = geom.attributes.position;
	for (let i = 0; i < pos.count; i += 1) {
		const x = pos.getX(i);
		const y = pos.getY(i);
		const z = pos.getZ(i);
		const t = Math.max(0, y / length);
		geom.attributes.uv.setXY(i, 0.5 + x / (2 * halfWidth), t);
		const bend = -arch * t * t;
		const cup = Math.abs(x / halfWidth) * thickness * 1.2;
		pos.setZ(i, z - thickness / 2 + bend + cup);
	}
	geom.computeVertexNormals();
	return geom;
}

interface TrailingPlantBuild {
	readonly stemsGeometry: THREE.BufferGeometry;
	readonly leavesGeometry: THREE.BufferGeometry;
}

function bakeTransformed(
	source: THREE.BufferGeometry,
	matrix: THREE.Matrix4
): THREE.BufferGeometry {
	const clone = source.clone();
	clone.applyMatrix4(matrix);
	return clone;
}

/**
 * Builds curved arching stems (Catmull-Rom TubeGeometry) and paired sculpted leaves
 * for a trailing/arching houseplant, merged into two static draw calls (stems + leaves).
 */
function buildTrailingPlant(
	potRadius: number,
	potHeight: number,
	foliageLeafGeometry: THREE.BufferGeometry
): TrailingPlantBuild {
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
	const stemParts: THREE.TubeGeometry[] = [];
	const leafParts: THREE.BufferGeometry[] = [];
	const matrix = new THREE.Matrix4();
	const pos = new THREE.Vector3();
	const quat = new THREE.Quaternion();
	const euler = new THREE.Euler();
	const scaleVec = new THREE.Vector3();

	stemSpecs.forEach((spec) => {
		const dirX = Math.cos(spec.azimuth);
		const dirZ = Math.sin(spec.azimuth);
		const startR = potRadius * 0.18;

		const p0 = new THREE.Vector3(dirX * startR, soilY, dirZ * startR);
		const p1 = new THREE.Vector3(dirX * spec.reach * 0.36, soilY + spec.peakY * 0.82, dirZ * spec.reach * 0.36);
		const p2 = new THREE.Vector3(dirX * spec.reach * 0.76, soilY + spec.peakY, dirZ * spec.reach * 0.76);
		const p3 = new THREE.Vector3(dirX * spec.reach, soilY + spec.tipY, dirZ * spec.reach);

		const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3]);
		stemParts.push(new THREE.TubeGeometry(curve, 10, 0.0022, 5, false));

		const leafFractions = spec.tipDrop ? [0.42, 0.68, 0.9, 1.0] : [0.48, 0.76, 1.0];
		leafFractions.forEach((t, lIdx) => {
			const pt = curve.getPoint(t);
			const isTip = t >= 0.99;
			const sideSign = isTip ? 0 : lIdx % 2 === 0 ? 1 : -1;
			const yaw = -spec.azimuth + Math.PI / 2 + sideSign * 0.55;
			const pitch = spec.tipDrop ? 0.85 + t * 0.65 : 0.42 + t * 0.55;
			const scale = isTip ? 0.78 : 0.88 + (1 - t) * 0.25;

			pos.copy(pt);
			euler.set(pitch, yaw, sideSign * 0.25, 'XYZ');
			quat.setFromEuler(euler);
			scaleVec.set(scale, scale, scale);
			matrix.compose(pos, quat, scaleVec);
			leafParts.push(bakeTransformed(foliageLeafGeometry, matrix));
		});
	});

	const stemsGeometry = mergeGeometries(stemParts, false);
	const leavesGeometry = mergeGeometries(leafParts, false);
	for (const g of stemParts) g.dispose();
	for (const g of leafParts) g.dispose();

	return { stemsGeometry, leavesGeometry };
}

function buildRosettePetals(
	leafCount: number,
	potRadius: number,
	potHeight: number,
	succulentPetalGeometry: THREE.BufferGeometry
): THREE.BufferGeometry {
	const petals = rosettePetals(leafCount, potRadius);
	const parts: THREE.BufferGeometry[] = [];
	const groupMatrix = new THREE.Matrix4();
	const localMatrix = new THREE.Matrix4();
	const combined = new THREE.Matrix4();
	const pos = new THREE.Vector3();
	const quat = new THREE.Quaternion();
	const euler = new THREE.Euler();
	const scaleVec = new THREE.Vector3();

	for (const petal of petals) {
		euler.set(0, petal.angle, 0, 'XYZ');
		quat.setFromEuler(euler);
		groupMatrix.compose(pos.set(0, potHeight * 0.87, 0), quat, scaleVec.set(1, 1, 1));

		euler.set(petal.pitch, 0, 0, 'XYZ');
		quat.setFromEuler(euler);
		localMatrix.compose(
			pos.set(0, 0, petal.radialOffset),
			quat,
			scaleVec.set(petal.scale, petal.scale, petal.scale)
		);

		combined.multiplyMatrices(groupMatrix, localMatrix);
		parts.push(bakeTransformed(succulentPetalGeometry, combined));
	}

	const merged = mergeGeometries(parts, false);
	for (const g of parts) g.dispose();
	return merged;
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
		24
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
		20
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
		20
	);

	const trailingPlants = new Map<string, TrailingPlantBuild>();
	const rosettePlants = new Map<string, THREE.BufferGeometry>();
	for (const prop of props) {
		if (prop.kind === 'planter' && prop.leafStyle === 'tall') {
			trailingPlants.set(
				prop.id,
				buildTrailingPlant(prop.potRadius, prop.potHeight, foliageLeafGeometry)
			);
		} else if (prop.kind === 'planter') {
			rosettePlants.set(
				prop.id,
				buildRosettePetals(prop.leafCount, prop.potRadius, prop.potHeight, succulentPetalGeometry)
			);
		}
	}
	foliageLeafGeometry.dispose();
	succulentPetalGeometry.dispose();

	function dispose() {
		for (const geom of Object.values(vaseGeometries)) {
			geom.dispose();
		}
		planterPotGeometry.dispose();
		hourglassBulbGeometry.dispose();
		candlestickHolderGeometry.dispose();
		for (const plant of trailingPlants.values()) {
			plant.stemsGeometry.dispose();
			plant.leavesGeometry.dispose();
		}
		for (const geom of rosettePlants.values()) {
			geom.dispose();
		}
	}

	return {
		vaseGeometries, planterPotGeometry,
		hourglassBulbGeometry, candlestickHolderGeometry, trailingPlants, rosettePlants, dispose
	};
}

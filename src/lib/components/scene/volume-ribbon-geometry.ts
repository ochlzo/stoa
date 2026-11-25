import * as THREE from 'three';
import type { BookmarkRibbonSpec } from '#lib/catalog/types.ts';

export interface BookmarkRibbonGeometryBundle {
	readonly geometry: THREE.BufferGeometry;
	readonly dispose: () => void;
}

/**
 * Builds a thin, smoothly draped procedural Bookmark Ribbon strip with a
 * swallowtail V-notch tip from pure-TS centerline control points.
 *
 * Call dispose() on component teardown to release GPU buffers.
 */
export function createBookmarkRibbonGeometry(
	spec: BookmarkRibbonSpec
): BookmarkRibbonGeometryBundle {
	const curvePoints = spec.points.map(([x, y, z]) => new THREE.Vector3(x, y, z));
	const curve = new THREE.CatmullRomCurve3(curvePoints);

	const segments = 14;
	const halfW = spec.width / 2;
	const halfT = spec.thickness / 2;
	const totalLen = Math.max(curve.getLength(), 1e-4);
	const notchStartT = Math.max(0.55, 1 - spec.notchDepth / totalLen);

	const positions: number[] = [];
	const indices: number[] = [];

	// Sample centerline frames and build a thin ribbon with left, center, and right columns
	// so the final segment can pull the center vertex back to form a clean swallowtail V-notch.
	for (let i = 0; i <= segments; i += 1) {
		const t = i / segments;
		const center = curve.getPoint(t);
		const tangent = curve.getTangent(t).normalize();

		// Lateral axis stays horizontal across the ribbon width
		const right = new THREE.Vector3(1, 0, 0);
		const normal = new THREE.Vector3().crossVectors(tangent, right).normalize();
		if (normal.y < 0) {
			normal.negate();
		}

		// Pull center vertex back along -tangent past notchStartT to form the swallowtail cut
		const notchAmount =
			t > notchStartT ? ((t - notchStartT) / (1 - notchStartT)) * spec.notchDepth : 0;
		const centerNotched = center.clone().addScaledVector(tangent, -notchAmount);

		const leftPt = center.clone().addScaledVector(right, -halfW);
		const rightPt = center.clone().addScaledVector(right, halfW);

		// Top face vertices (0: left, 1: center, 2: right)
		const topLeft = leftPt.clone().addScaledVector(normal, halfT);
		const topCenter = centerNotched.clone().addScaledVector(normal, halfT);
		const topRight = rightPt.clone().addScaledVector(normal, halfT);

		// Bottom face vertices (3: left, 4: center, 5: right)
		const botLeft = leftPt.clone().addScaledVector(normal, -halfT);
		const botCenter = centerNotched.clone().addScaledVector(normal, -halfT);
		const botRight = rightPt.clone().addScaledVector(normal, -halfT);

		positions.push(
			topLeft.x, topLeft.y, topLeft.z,
			topCenter.x, topCenter.y, topCenter.z,
			topRight.x, topRight.y, topRight.z,
			botLeft.x, botLeft.y, botLeft.z,
			botCenter.x, botCenter.y, botCenter.z,
			botRight.x, botRight.y, botRight.z
		);

		if (i < segments) {
			const row = i * 6;
			const next = (i + 1) * 6;

			// Top surface (2 quads: left-center and center-right)
			indices.push(row + 0, next + 0, next + 1, row + 0, next + 1, row + 1);
			indices.push(row + 1, next + 1, next + 2, row + 1, next + 2, row + 2);

			// Bottom surface (reversed winding)
			indices.push(row + 3, next + 4, next + 3, row + 3, row + 4, next + 4);
			indices.push(row + 4, next + 5, next + 4, row + 4, row + 5, next + 5);

			// Left & right side edges
			indices.push(row + 0, row + 3, next + 3, row + 0, next + 3, next + 0);
			indices.push(row + 2, next + 2, next + 5, row + 2, next + 5, row + 5);
		}
	}

	// Cap the swallowtail tip edges
	const last = segments * 6;
	indices.push(last + 0, last + 3, last + 4, last + 0, last + 4, last + 1);
	indices.push(last + 1, last + 4, last + 5, last + 1, last + 5, last + 2);

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
	geometry.setIndex(indices);
	geometry.computeVertexNormals();

	return {
		geometry,
		dispose: () => {
			geometry.dispose();
		}
	};
}

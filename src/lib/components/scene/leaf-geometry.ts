import { BackSide, PlaneGeometry, type CanvasTexture } from 'three';
import {
	createPageMaterial,
	PAGE_STACK_SEGMENTS
} from '#lib/components/scene/open-volume-geometry.ts';
import { curlLeafVertex, type LeafTurn } from '#lib/physics/leaf-turn.ts';
import { READING_VOLUME_CONFIG } from '#lib/physics/reading-volume.ts';

export interface LeafGeometryOptions {
	readonly width: number;
	readonly height: number;
	readonly leftThickness: number;
	readonly rightThickness: number;
	readonly turn: LeafTurn;
	readonly clay?: boolean;
	readonly frontTexture: CanvasTexture;
	readonly backTexture: CanvasTexture;
}

export function createLeafGeometry(options: LeafGeometryOptions) {
	const { width, height, leftThickness, rightThickness, turn, frontTexture, backTexture } = options;
	const geometry = new PlaneGeometry(width, height, PAGE_STACK_SEGMENTS, 1);
	const position = geometry.attributes.position;
	const uv = geometry.attributes.uv;
	const count = geometry.index!.count;
	geometry.addGroup(0, count, 0);
	geometry.addGroup(0, count, 1);
	backTexture.repeat.x = -1;
	backTexture.offset.x = 1;
	const materials = [
		createPageMaterial(frontTexture, options.clay ?? true),
		createPageMaterial(backTexture, options.clay ?? true, BackSide)
	];
	let lastProgress = -1;
	const gutterDepth = Math.min(leftThickness, rightThickness);

	function update() {
		if (turn.progress === lastProgress) return;
		lastProgress = turn.progress;
		for (let i = 0; i < position.count; i++) {
			const u = turn.direction === 1 ? uv.getX(i) : 1 - uv.getX(i);
			const { x, z } = curlLeafVertex({
				u,
				width,
				progress: turn.progress,
				direction: turn.direction,
				leftThickness,
				rightThickness,
				gutterDepth,
				arch: READING_VOLUME_CONFIG.pageGutterArch,
				hingeAngle: READING_VOLUME_CONFIG.openRestAngle
			});
			position.setX(i, x);
			position.setZ(i, z);
		}
		position.needsUpdate = true;
		geometry.computeVertexNormals();
	}
	update();

	return {
		geometry,
		materials,
		update,
		dispose() {
			geometry.dispose();
			for (const material of materials) material.dispose();
			frontTexture.dispose();
			backTexture.dispose();
		}
	};
}

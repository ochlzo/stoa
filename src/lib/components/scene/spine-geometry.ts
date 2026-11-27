import { setStampFace } from '#lib/components/scene/volume-stamp-geometry.ts';
import { BoxGeometry } from 'three';

/** Bend a strip around the bound edge. Its cut ends meet the two cover boards. */
export function createSpineGeometry(radius: number, depth: number, boardThickness: number) {
	const geometry = new BoxGeometry(1, 1, 1, 12);
	const position = geometry.attributes.position;
	for (let i = 0; i < position.count; i++) {
		const angle = Math.PI * position.getX(i);
		const inset = (0.5 - position.getZ(i)) * boardThickness;
		position.setXYZ(i,
			Math.sin(angle) * (radius - inset),
			position.getY(i),
			Math.cos(angle) * (depth - Math.min(inset, depth * 0.8))
		);
	}
	geometry.computeVertexNormals();
	setStampFace(geometry, '+z');
	return { geometry, dispose: () => geometry.dispose() };
}

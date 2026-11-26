import assert from 'node:assert/strict';
import { it } from 'node:test';
import { BoxGeometry } from 'three';
import { setStampFace } from '#lib/components/scene/volume-stamp-geometry.ts';

it('prints on the outward face only and preserves its original lettering orientation', () => {
	const geometry = new BoxGeometry(1, 1, 1, 32);
	const { uv, normal } = geometry.attributes;
	for (const face of ['+x', '-x', '+z', '-z'] as const) {
		setStampFace(geometry, face);
		const coords = geometry.attributes.stampUv;
		for (let i = 0; i < uv.count; i++) {
			const axis = face.endsWith('x') ? normal.getX(i) : normal.getZ(i);
			const printed = axis === (face.startsWith('+') ? 1 : -1);
			assert.equal(coords.getX(i), printed ? uv.getX(i) : -1);
			assert.equal(coords.getY(i), printed ? uv.getY(i) : -1);
		}
	}
	geometry.dispose();
});

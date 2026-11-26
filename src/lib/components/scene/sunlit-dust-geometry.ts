import {
	AdditiveBlending,
	BufferGeometry,
	DoubleSide,
	Float32BufferAttribute,
	PlaneGeometry,
	ShaderMaterial,
	Vector3
} from 'three';
import { STUDY_WINDOW } from '#lib/catalog/lookdev.ts';
import { seedDustMotes } from '#lib/physics/study-lighting.ts';

export function createSunlitDust() {
	const { positions, variation } = seedDustMotes(120);
	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
	geometry.setAttribute('variation', new Float32BufferAttribute(variation, 3));
	const material = new ShaderMaterial({
		transparent: true,
		depthWrite: false,
		uniforms: { time: { value: 0 }, intensity: { value: 1 }, pixelRatio: { value: 1 } },
		vertexShader: `
			attribute vec3 variation;
			uniform float time, pixelRatio;
			varying float glow;
			void main() {
				float phase = variation.x;
				float t = time * (0.14 + variation.y * 0.08);
				vec3 drift = vec3(sin(t + phase), sin(t * 0.64 + phase * 3.0), cos(t * 0.83 + phase));
				vec4 eye = modelViewMatrix * vec4(position + drift * vec3(0.026, 0.041, 0.019), 1.0);
				gl_Position = projectionMatrix * eye;
				gl_PointSize = pixelRatio * clamp(variation.y * 3.0 / max(0.5, -eye.z), 1.8, 5.0);
				glow = variation.z * (0.8 + 0.2 * sin(t + phase));
			}`,
		fragmentShader: `
			uniform float intensity;
			varying float glow;
			void main() {
				float r = length(gl_PointCoord - 0.5) * 2.0;
				float alpha = (1.0 - smoothstep(0.18, 1.0, r)) * glow * intensity;
				gl_FragColor = vec4(1.0, 0.90, 0.63, alpha);
				#include <colorspace_fragment>
			}`
	});

	// Soft feathered afternoon sunbeam crossing diagonally through the dust volume.
	const shaft = new PlaneGeometry(1, 1);
	const source = new Vector3(...STUDY_WINDOW.position);
	const end = new Vector3(...STUDY_WINDOW.target);
	const axis = source.sub(end);
	const transverse = new Vector3(-axis.y, axis.x, 0).normalize();
	const vertices = shaft.attributes.position;
	for (let i = 0; i < vertices.count; i++) {
		const t = 0.08 + 0.34 * shaft.attributes.uv.getY(i);
		const point = end.clone().addScaledVector(axis, t);
		point.addScaledVector(transverse, 2.4 * vertices.getX(i) * STUDY_WINDOW.halfWidth * (1 - t));
		vertices.setXYZ(i, point.x, point.y, point.z);
	}

	const scattering = new ShaderMaterial({
		uniforms: { intensity: { value: 1 } },
		transparent: true,
		depthWrite: false,
		side: DoubleSide,
		forceSinglePass: true,
		blending: AdditiveBlending,
		vertexShader: `
			varying vec2 alongBeam;
			void main() {
				alongBeam = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}`,
		fragmentShader: `
			varying vec2 alongBeam;
			uniform float intensity;
			void main() {
				float x = alongBeam.x * 2.0 - 1.0;
				float feather = exp(-4.2 * x * x) * (1.0 - smoothstep(0.68, 1.0, abs(x)));
				float ends = smoothstep(0.0, 0.30, alongBeam.y) * (1.0 - smoothstep(0.75, 1.0, alongBeam.y));
				gl_FragColor = vec4(1.0, 0.85, 0.58, 0.055 * intensity * feather * ends);
			}`
	});

	return {
		geometry,
		material,
		shaft,
		scattering,
		dispose() {
			geometry.dispose();
			material.dispose();
			shaft.dispose();
			scattering.dispose();
		}
	};
}

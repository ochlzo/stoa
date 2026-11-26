import { BufferGeometry, Float32BufferAttribute, ShaderMaterial } from 'three';
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
	return {
		geometry,
		material,
		dispose() {
			geometry.dispose();
			material.dispose();
		}
	};
}

import { ShaderMaterial } from 'three';

export interface BackdropVignetteBundle {
	readonly material: ShaderMaterial;
	setLevels(centerOpacity: number, edgeOpacity: number): void;
	dispose(): void;
}

/**
 * Procedural radial fisheye dark-shadow vignette material placed behind an inspected
 * or open Volume in Lookdev. Keeps a softly lit pocket centered behind the Volume
 * while curving into deep obsidian shadow toward the viewport edges.
 */
export function createBackdropVignetteMaterial(): BackdropVignetteBundle {
	const material = new ShaderMaterial({
		transparent: true,
		depthWrite: false,
		uniforms: {
			centerOpacity: { value: 0 },
			edgeOpacity: { value: 0 }
		},
		vertexShader: `
			varying vec2 vUv;
			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
		fragmentShader: `
			uniform float centerOpacity;
			uniform float edgeOpacity;
			varying vec2 vUv;
			void main() {
				vec2 p = (vUv - 0.5) * 2.0;
				float r = length(vec2(p.x * 0.92, p.y * 1.05));
				float lens = smoothstep(0.12, 1.18, r);
				float fisheye = pow(lens, 1.35);
				float alpha = clamp(mix(centerOpacity, edgeOpacity, fisheye), 0.0, 0.96);
				gl_FragColor = vec4(0.015, 0.012, 0.010, alpha);
			}
		`
	});

	return {
		material,
		setLevels(centerOpacity: number, edgeOpacity: number) {
			material.uniforms.centerOpacity.value = centerOpacity;
			material.uniforms.edgeOpacity.value = edgeOpacity;
		},
		dispose() {
			material.dispose();
		}
	};
}

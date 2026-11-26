import { PMREMGenerator, type Texture, type WebGLRenderer } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface ProceduralEnvironmentBundle {
	readonly texture: Texture;
	dispose(): void;
}

/**
 * Generates a prefiltered procedural room environment map (IBL) entirely in memory
 * using Three.js `PMREMGenerator` + `RoomEnvironment` (zero external HDRI files,
 * per ADR 0001). Callers must invoke `dispose()` on teardown to release the GPU
 * render target.
 */
export function createStudyEnvironment(renderer: WebGLRenderer): ProceduralEnvironmentBundle {
	const pmrem = new PMREMGenerator(renderer);
	pmrem.compileEquirectangularShader();

	const roomEnvironment = new RoomEnvironment();
	const renderTarget = pmrem.fromScene(roomEnvironment, 0.04);

	roomEnvironment.dispose();
	pmrem.dispose();

	return {
		texture: renderTarget.texture,
		dispose(): void {
			renderTarget.dispose();
		}
	};
}

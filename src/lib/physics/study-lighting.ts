import {
	STUDY_LIGHTING,
	STUDY_WINDOW,
	createSeededRandom,
	type StudyLightingTarget
} from '#lib/catalog/lookdev.ts';

export { STUDY_LIGHTING, STUDY_WINDOW };
export type StudyLighting = StudyLightingTarget;

const channels = Object.keys(STUDY_LIGHTING.shelf) as (keyof StudyLighting)[];

export function lightingBlend(delta: number) {
	return -Math.expm1(-4.8 * Math.max(0, Math.min(delta, 0.05)));
}

export function stepStudyLighting(current: StudyLighting, target: StudyLighting, delta: number) {
	const blend = lightingBlend(delta);
	for (const channel of channels) current[channel] += (target[channel] - current[channel]) * blend;
}

export function stepBackdropOpacity(current: number, target: number, delta: number): number {
	return current + (target - current) * lightingBlend(delta);
}

export function seedDustMotes(count: number, seed = 73213) {
	const random = createSeededRandom(seed);
	const positions = new Float32Array(count * 3);
	const variation = new Float32Array(count * 3);
	const { position, target, angle } = STUDY_WINDOW;
	const dx = position[0] - target[0];
	const dy = position[1] - target[1];
	const diagonal = Math.hypot(dx, dy);
	for (let i = 0; i < count; i++) {
		const t = 0.08 + 0.2 * random();
		const radius = Math.sqrt(random());
		const azimuth = 2 * Math.PI * random();
		const across = (1 - t) * STUDY_WINDOW.halfWidth * radius * Math.cos(azimuth);
		const along = (1 - t) * Math.tan(angle) * radius * Math.sin(azimuth);
		positions[i * 3] = target[0] + t * (position[0] - target[0]) + (dx * along - dy * across) / diagonal;
		positions[i * 3 + 1] = target[1] + t * (position[1] - target[1]) + (dy * along + dx * across) / diagonal;
		positions[i * 3 + 2] = target[2] + t * (position[2] - target[2]);
		variation[i * 3] = random() * 2 * Math.PI;
		variation[i * 3 + 1] = 0.7 + random() * 0.95;
		variation[i * 3 + 2] = (1 - 0.82 * radius ** 3) * (0.52 + 0.48 * random());
	}
	return { positions, variation };
}

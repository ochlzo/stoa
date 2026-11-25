import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Session } from 'node:inspector/promises';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';

test('ShelfCamera reuses bounds across idle frames and refreshes them after resize', async t => {
	const component = new URL('../src/lib/components/scene/ShelfCamera.svelte', import.meta.url);
	const physics = new URL('../src/lib/physics/shelf-camera.ts', import.meta.url);
	// Supply a viewport and capture the real frame callback without starting WebGL.
	const frameDriver = 'data:text/javascript,' + encodeURIComponent(`
		export const size = { current: { width: 1200, height: 760 } };
		export const T = {};
		export const useThrelte = () => ({ size });
		export let frame;
		export const useTask = callback => { frame = callback; };
	`);
	const hooks = registerHooks({
		resolve(specifier, context, next) {
			if (context.parentURL === component.href && specifier === '@threlte/core') {
				return { url: frameDriver, shortCircuit: true };
			}
			return next(specifier, context);
		},
		load(url, context, next) {
			if (url !== component.href) return next(url, context);
			const { js } = compile(readFileSync(component, 'utf8'), { generate: 'server' });
			return { source: js.code, format: 'module', shortCircuit: true };
		}
	});
	t.after(() => hooks.deregister());
	const { default: ShelfCamera } = await import(component.href);
	const driver = await import(frameDriver);
	assert.equal(typeof render(ShelfCamera).body, 'string');

	// Count calls inside the physics module, including calls that bypass the cached reader.
	const profiler = new Session();
	profiler.connect();
	t.after(() => profiler.disconnect());
	await profiler.post('Profiler.enable');
	await profiler.post('Profiler.startPreciseCoverage', { callCount: true, detailed: false });
	async function boundsCalls() {
		const { result } = await profiler.post('Profiler.takePreciseCoverage');
		const script = result.find(entry => entry.url === physics.href);
		const fn = script?.functions.find(entry => entry.functionName === 'computeShelfCameraBounds');
		return fn?.ranges[0].count ?? 0;
	}

	driver.frame(1 / 60);
	await boundsCalls(); // Discard the initial fill. Each snapshot resets the counts.
	for (let i = 0; i < 60; i++) driver.frame(1 / 60);
	assert.equal(await boundsCalls(), 0, 'idle frames must reuse the current bounds');

	driver.size.current.width = 900;
	driver.frame(1 / 60);
	assert.equal(await boundsCalls(), 1, 'new viewport dimensions must refresh bounds once');
	for (let i = 0; i < 60; i++) driver.frame(1 / 60);
	assert.equal(await boundsCalls(), 0, 'frames after resize must reuse the new bounds');
});

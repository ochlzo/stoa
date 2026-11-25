import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

test('lint rejects side-effect imports and checks each frame callback separately', t => {
	const root = mkdtempSync(join(tmpdir(), 'stoa-lint-'));
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const physics = join(root, 'src/lib/physics');
	mkdirSync(physics, { recursive: true });
	writeFileSync(join(physics, 'motion.ts'), "import 'three';");
	writeFileSync(join(root, 'src/Test.svelte'), [
		'<script lang="ts">',
		'useTask(delta => advance(clampDelta(delta)));',
		'useTask(delta => advance(delta));',
		'</script>'
	].join('\n'));
	const script = fileURLToPath(new URL('./lint-architecture.mjs', import.meta.url));
	const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
	assert.equal(result.status, 1);
	assert.match(result.stderr, /motion\.ts:1 \[pure-ts-layer\]/);
	assert.match(result.stderr, /Test\.svelte:3 \[clamp-usetask-delta\]/);
	assert.match(result.stderr, /2 violation\(s\)/);
});

test('ShelfCamera forwards input and keeps gesture arithmetic in physics', t => {
	const root = mkdtempSync(join(tmpdir(), 'stoa-camera-lint-'));
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const scene = join(root, 'src/lib/components/scene');
	mkdirSync(scene, { recursive: true });
	writeFileSync(join(scene, 'ShelfCamera.svelte'), [
		'<script lang="ts">',
		'function distance(x, y) { return Math.hypot(x, y); }',
		'const onDrag = e => gestures.move(e.clientX - previousX, distance(e.clientX, e.clientY));',
		'canvas.addEventListener("pointermove", onDrag);',
		'canvas.addEventListener("wheel", e => gestures.wheel(e.deltaY));',
		'const cameraAspect = width / height;',
		'</script>'
	].join('\n'));
	const script = fileURLToPath(new URL('./lint-architecture.mjs', import.meta.url));
	const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
	assert.equal(result.status, 1);
	assert.match(result.stderr, /ShelfCamera\.svelte:2 \[camera-gesture-math\]/);
	assert.match(result.stderr, /ShelfCamera\.svelte:3 \[camera-gesture-math\]/);
	assert.match(result.stderr, /2 violation\(s\)/);
});

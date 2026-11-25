import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, 'src');

/** @typedef {{ file: string; line: number; rule: string; message: string }} Violation */

/** @param {string} dir @returns {string[]} */
function walk(dir) {
	/** @type {string[]} */
	const files = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...walk(full));
		} else if (/\.(ts|svelte)$/.test(entry.name)) {
			files.push(full);
		}
	}
	return files;
}

/** @param {string} text @param {number} index */
function lineOf(text, index) {
	return text.slice(0, index).split('\n').length;
}

/** @type {Violation[]} */
const violations = [];

for (const absPath of walk(SRC_DIR)) {
	const relPath = relative(ROOT, absPath).replaceAll('\\', '/');
	const content = readFileSync(absPath, 'utf8');
	const isPureLayer =
		relPath.startsWith('src/lib/catalog/') || relPath.startsWith('src/lib/physics/');
	const isSceneSvelte =
		relPath.startsWith('src/lib/components/scene/') && relPath.endsWith('.svelte');
	const isGeometryHelper =
		relPath.startsWith('src/lib/components/scene/') && relPath.endsWith('-geometry.ts');

	// 1. Enforce `#lib/*` imports instead of relative `./` or `../` inside src/lib/
	for (const match of content.matchAll(/(?:from|import)\s+['"](\.\.?\/[^'"]+)['"]/g)) {
		const specifier = match[1];
		if (relPath.startsWith('src/lib/')) {
			violations.push({
				file: relPath,
				line: lineOf(content, match.index ?? 0),
				rule: 'use-lib-subpath-imports',
				message: `Use "#lib/..." instead of relative import "${specifier}" (with explicit .ts/.svelte extension).`
			});
		}
	}

	// 2. Enforce pure TypeScript layers (`catalog/` and `physics/`)
	if (isPureLayer) {
		for (const match of content.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
			const spec = match[1];
			if (
				spec === 'three' ||
				spec.startsWith('three/') ||
				spec === 'svelte' ||
				spec.startsWith('svelte/') ||
				spec.startsWith('@threlte/') ||
				spec.startsWith('#lib/components/') ||
				spec.startsWith('#lib/state/')
			) {
				violations.push({
					file: relPath,
					line: lineOf(content, match.index ?? 0),
					rule: 'pure-ts-layer',
					message: `"${spec}" is forbidden in ${relPath}. Keep src/lib/catalog/ and src/lib/physics/ pure TypeScript (no Three.js, Svelte, Threlte, or UI state).`
				});
			}
		}
	}

	// 3. Keep scene .svelte components thin: no manual THREE.*Geometry or THREE.*Material allocations
	if (isSceneSvelte) {
		for (const match of content.matchAll(/\bnew\s+THREE\.\w*(?:Geometry|Material)\s*\(/g)) {
			violations.push({
				file: relPath,
				line: lineOf(content, match.index ?? 0),
				rule: 'scene-geometry-disposal',
				message: `Found "${match[0]}" in a scene .svelte component. Move manual Three.js allocations into a sibling "*-geometry.ts" module that exposes dispose(), and call "$effect(() => dispose)" here (see shelf-prop-geometry.ts).`
			});
		}
	}

	// 4. Require geometry helpers that allocate Three.js resources to expose dispose()
	if (isGeometryHelper) {
		const allocates = /\bnew\s+THREE\.\w*(?:Geometry|Material)\s*\(/.test(content);
		const hasDispose = /\bdispose\b/.test(content) && /\.dispose\(\)/.test(content);
		if (allocates && !hasDispose) {
			violations.push({
				file: relPath,
				line: 1,
				rule: 'geometry-helper-dispose',
				message: `Geometry helper allocates Three.js resources without calling .dispose(). Expose a dispose() function that disposes every created geometry/material.`
			});
		}
	}

	// 5. Enforce clamped delta in Threlte useTask()
	if (/\buseTask\s*\(/.test(content)) {
		const clampsDelta =
			/Math\.min\s*\(\s*delta\s*,/.test(content) || /\bclampDelta\s*\(/.test(content);
		if (!clampsDelta) {
			const idx = content.search(/\buseTask\s*\(/);
			violations.push({
				file: relPath,
				line: lineOf(content, idx),
				rule: 'clamp-usetask-delta',
				message: `useTask() must clamp delta (e.g. "Math.min(delta, 0.05)") so tab switches never cause physics jumps.`
			});
		}
	}

	// 6. Enforce GLOSSARY.md canonical Volume type names
	for (const match of content.matchAll(
		/\b(VolumeEntry|ReadableVolumeEntry|PlaceholderVolumeEntry)\b/g
	)) {
		const canonical = match[1].replace(/Entry$/, '');
		violations.push({
			file: relPath,
			line: lineOf(content, match.index ?? 0),
			rule: 'glossary-canonical-names',
			message: `Use canonical GLOSSARY.md name "${canonical}" instead of "${match[1]}".`
		});
	}
}

if (violations.length > 0) {
	console.error(`Architecture lint failed with ${violations.length} violation(s):\n`);
	for (const v of violations) {
		console.error(`  ${v.file}:${v.line} [${v.rule}]\n    ${v.message}\n`);
	}
	process.exit(1);
}

console.log('Architecture lint passed (0 violations).');

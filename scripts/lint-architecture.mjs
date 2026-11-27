import ts from 'typescript';
import { parse } from 'svelte/compiler';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, 'src');
const READABLE_CATALOG_DIR = join(ROOT, 'src/lib/catalog/readable');
const IMAGE_ASSET_EXT = /\.(?:webp|png|jpe?g|gif|avif|svg)$/i;

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

/** @param {string} dir @returns {string[]} */
function walkImageAssets(dir) {
	if (!existsSync(dir)) return [];
	/** @type {string[]} */
	const files = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...walkImageAssets(full));
		} else if (IMAGE_ASSET_EXT.test(entry.name)) {
			files.push(full);
		}
	}
	return files;
}

/** @param {string} text @param {number} index */
function lineOf(text, index) {
	return text.slice(0, index).split('\n').length;
}

// Inspect script syntax so comments, strings and clamps in other callbacks cannot satisfy a rule.
function visit(node, inspect) {
	inspect(node);
	ts.forEachChild(node, child => visit(child, inspect));
}

const gestureArithmetic = new Set([
	'+', '-', '*', '/', '%', '**', '+=', '-=', '*=', '/=', '%=', '**='
]);

function checkSceneGestureHandlers(source, callbacks, report, eventPattern, rule, targetModule) {
	const checked = new Set();
	function checkHandler(handler) {
		const fn = callbacks.get(handler.getText()) ?? handler;
		if (!fn.body || checked.has(fn)) return;
		checked.add(fn);
		visit(fn.body, node => {
			if (ts.isBinaryExpression(node) && gestureArithmetic.has(node.operatorToken.getText())) {
				report(node, rule, `Move gesture calculations into ${targetModule}.`);
			}
			if (ts.isCallExpression(node)) {
				const callee = node.expression;
				if (ts.isPropertyAccessExpression(callee) && callee.expression.getText() === 'Math') {
					report(node, rule, `Calculate gesture distances and thresholds in ${targetModule}.`);
				}
				if (ts.isIdentifier(callee) && callbacks.has(callee.text)) checkHandler(callee);
			}
		});
	}
	visit(source, node => {
		if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
		const [event, handler] = node.arguments;
		if (node.expression.name.text === 'addEventListener' && handler &&
			ts.isStringLiteral(event) && eventPattern.test(event.text)) checkHandler(handler);
	});
}

function checkScripts(file, content, isPureLayer) {
	let sections = [{ start: 0, end: content.length }];
	if (file.endsWith('.svelte')) {
		const component = parse(content, { modern: true });
		sections = [component.instance, component.module].filter(Boolean).map(script => script.content);
	}
	for (const section of sections) {
		const source = ts.createSourceFile(file, content.slice(section.start, section.end), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
		const report = (node, rule, message) => violations.push({
			file, line: lineOf(content, section.start + node.getStart(source)), rule, message
		});
		const callbacks = new Map();
		const tasks = [];
		visit(source, node => {
			if (isPureLayer && (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
				const spec = node.moduleSpecifier.text;
				if (/^(?:three|svelte)(?:$|\/)|^@threlte\/|^#lib\/(?:components|state)\//.test(spec)) {
					report(node, 'pure-ts-layer', `"${spec}" is forbidden in the pure TypeScript layer.`);
				}
			}
			if (ts.isFunctionDeclaration(node) && node.name) callbacks.set(node.name.text, node);
			if (ts.isVariableDeclaration(node) && node.initializer) callbacks.set(node.name.getText(), node.initializer);
			if (ts.isCallExpression(node) && node.expression.getText() === 'useTask') tasks.push(node);
		});
		if (file === 'src/lib/components/scene/ShelfCamera.svelte') {
			checkSceneGestureHandlers(
				source,
				callbacks,
				report,
				/^(pointer|touch|wheel)/,
				'camera-gesture-math',
				'the camera physics module'
			);
		} else if (file.startsWith('src/lib/components/scene/')) {
			checkSceneGestureHandlers(
				source,
				callbacks,
				report,
				/^wheel$/,
				'scene-wheel-gesture-math',
				'src/lib/physics/'
			);
		}
		for (const task of tasks) {
			// Threlte accepts an optional key before the callback.
			const callback = task.arguments.map(arg => callbacks.get(arg.getText()) ?? arg)
				.find(arg => ts.isArrowFunction(arg) || ts.isFunctionExpression(arg) || ts.isFunctionDeclaration(arg));
			if (callback && !callback.parameters.length) continue;
			const delta = callback?.parameters[0]?.name.getText();
			let clamped = false;
			if (callback?.body) visit(callback.body, node => {
				if (!ts.isCallExpression(node) || node.arguments[0]?.getText() !== delta) return;
				const callee = node.expression.getText();
				if (callee === 'clampDelta' || (callee === 'Math.min' && node.arguments.length >= 2)) clamped = true;
			});
			if (!clamped) report(task, 'clamp-usetask-delta', 'Clamp the elapsed time inside this useTask callback.');
		}
	}
}

/** @type {Violation[]} */
const violations = [];

// 0. Keep Readable Volume image assets in static/volumes/<volume-id>/ (not inside src/lib/catalog/readable/)
for (const absPath of walkImageAssets(READABLE_CATALOG_DIR)) {
	const relPath = relative(ROOT, absPath).replaceAll('\\', '/');
	violations.push({
		file: relPath,
		line: 1,
		rule: 'volume-assets-in-static',
		message:
			'Move Readable Volume image assets into static/volumes/<volume-id>/ (see docs/CONTRIBUTING_VOLUME.md).'
	});
}

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

	checkScripts(relPath, content, isPureLayer);

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

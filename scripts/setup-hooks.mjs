import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = process.cwd();
const hookPath = resolve(repoRoot, '.githooks', 'pre-push');

if (!existsSync(hookPath)) {
	console.error('Error: .githooks/pre-push not found. Run this script from the repository root.');
	process.exit(1);
}

try {
	execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
		stdio: 'inherit'
	});
} catch {
	console.error('Error: Failed to configure Git hooks. Make sure Git is installed and you are inside the repository.');
	process.exit(1);
}

try {
	chmodSync(hookPath, 0o755);
} catch {
	// Best-effort on filesystems that do not support POSIX file modes.
}

console.log('Git hooks enabled (core.hooksPath = .githooks).');
console.log("Direct pushes to 'main' are now blocked locally.");

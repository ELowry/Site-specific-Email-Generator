import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

try {
	const gitStatus = execSync('git status --porcelain').toString().trim();

	if (gitStatus.length > 0) {
		console.error('\n[Email Generator] BUILD FAILED: Working directory is not clean.');
		console.error(
			'[Email Generator] Please commit or stash the following changes before packaging the source:\n'
		);
		console.error(gitStatus, '\n');
		process.exit(1);
	}

	const pkgPath = new URL('../package.json', import.meta.url);
	const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

	const safeName = pkg.name.replace(/-/g, '_');
	const filename = `${safeName}-${pkg.version}-source.zip`;

	console.log(`[Email Generator] Packaging source code into dist/${filename}...`);

	mkdirSync('dist', { recursive: true });

	execSync(`git archive -o dist/${filename} HEAD`, { stdio: 'inherit' });
	console.log('[Email Generator] Source packaged successfully!');
} catch (error) {
	console.error('[Email Generator] Failed to build source archive:', error);
	process.exit(1);
}

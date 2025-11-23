import 'colorts/lib/string';
import fs from 'fs';
import path from 'path';

async function main () {
	const args = process.argv.slice(2);
	const scriptName = args[0];
	const scriptArgs = args.slice(1);

	const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname));

	if (!scriptName) {
		console.log('Usage: yarn testCase <script-name> [args...]');
		console.log('Available scripts:');
		const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
		for (const f of files) {
			if (f === '_index.ts' || f === '_index.js') continue;
			console.log(' -', f.replace(/\.(ts|js)$/, ''));
		}
		process.exit(1);
	}

	// Try importing common extensions in order (.ts then .js), falling back to raw name.
	const tryPaths = [`./${scriptName}.ts`, `./${scriptName}.js`, `./${scriptName}`];
	let mod: any = null;
	let lastErr: any = null;
	for (const p of tryPaths) {
		try {
			mod = await import(p);
			break;
		} catch (e) {
			lastErr = e;
		}
	}
	if (!mod) {
		console.error(`script not found or failed to import: ${scriptName}`);
		console.error(lastErr);
		process.exitCode = 2;
		return;
	}
	try {
		// const mod = await import(found);
		// If the module exports a `run` function, call it. Otherwise if it has a default export that's a function, call it.
		const run = (mod && typeof mod.run === 'function') ? mod.run : (mod && typeof mod.default === 'function' ? mod.default : null);
		if (run) {
			const res = run(...scriptArgs);
			if (res && typeof res.then === 'function') await res;
		} else {
			// No run function: assume module side-effects execute on import
		}
	} catch (err) {
		console.error('error running script:', err);
		process.exitCode = 3;
	}
}

void main();



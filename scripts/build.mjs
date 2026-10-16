import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parseConfig } from '../lib/config.js';

const root = fileURLToPath(new URL('../', import.meta.url));
parseConfig(JSON.parse(await readFile(new URL('../sites.json', import.meta.url), 'utf8')));
const output = new URL('../dist/', import.meta.url);
// This fixed, repository-owned output directory is the only directory removed.
if (resolve(fileURLToPath(output)) !== resolve(root, 'dist')) throw new Error('Unexpected build output path');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const item of ['index.html', 'styles.css', 'app.js', 'sites.json', 'lib', 'assets', '.nojekyll']) {
  await cp(new URL(item, new URL('../', import.meta.url)), new URL(item, output), { recursive: true });
}
console.log(`Static site built: ${root}dist`);

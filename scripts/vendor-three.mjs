/**
 * Vendor Three.js into the repo so the site has zero runtime CDN dependency
 * for 3D. Rewrites the bare `three` specifier to a local path and flattens
 * the examples/jsm import closure into one folder.
 *
 * Jalankan:  node scripts/vendor-three.mjs
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const threeDir = path.dirname(require.resolve('three'));
const base = path.resolve(threeDir, '..');

const outDir = path.join(root, 'vendor', 'three');

const files = [
  // three.module.js re-exports the core build, and the loaders only pull a
  // small slice of that surface — keep core vendored too so nothing reaches
  // outside vendor/three/ at runtime.
  ['build/three.core.js', 'three.core.js'],
  ['build/three.module.js', 'three.module.js'],
  ['examples/jsm/loaders/GLTFLoader.js', 'GLTFLoader.js'],
  ['examples/jsm/loaders/DRACOLoader.js', 'DRACOLoader.js'],
  ['examples/jsm/utils/BufferGeometryUtils.js', 'BufferGeometryUtils.js'],
  ['examples/jsm/utils/SkeletonUtils.js', 'SkeletonUtils.js'],
  ['examples/jsm/environments/RoomEnvironment.js', 'RoomEnvironment.js'],
];

const BARE = /^import\s*(?:[\w*{}\s,]+from\s*)?['"]three['"]/gm;

let total = 0;
await fs.mkdir(outDir, { recursive: true });

for (const [src, dest] of files) {
  const text = await fs.readFile(path.join(base, src), 'utf8');
  let rewritten = text
    .replace(BARE, (line) => line.replace(/['"]three['"]/, "'./three.module.js'"))
    // flatten examples/jsm relative imports into one folder
    .replace(/(\.\.\/)+utils\//g, './')
    .replace(/(\.\.\/)+loaders\//g, './');

  const leftover = [...rewritten.matchAll(/^import\s*(?:[\w*{}\s,]+from\s*)?['"](\.[^'"]+)['"]/gm)]
    .map((m) => m[1])
    .filter((spec) => !spec.startsWith('./three.module.js') && !/^\.\/[\w.-]+$/.test(spec));

  if (leftover.length) throw new Error(`unresolved imports in ${src}: ${leftover.join(', ')}`);

  await fs.writeFile(path.join(outDir, dest), rewritten);
  total += rewritten.length;
  console.log(`vendor/three/${dest}`);
}

console.log(`\nDone — ${files.length} files, ${(total / 1048576).toFixed(2)} MB total.`);

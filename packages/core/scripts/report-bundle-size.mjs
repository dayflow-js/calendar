import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const directory = path.resolve(
  process.argv[2] ?? path.join(packageRoot, 'dist')
);
const files = [
  'index.esm.js',
  'styles.components.css',
  'styles.css',
  'index.d.ts',
];
const sizes = [];
for (const file of files) {
  const content = await fs.readFile(path.join(directory, file));
  sizes.push({
    file,
    bytes: content.length,
    gzip: gzipSync(content, { level: 9 }).length,
    brotli: brotliCompressSync(content).length,
  });
}
console.log(JSON.stringify({ directory, sizes }, null, 2));

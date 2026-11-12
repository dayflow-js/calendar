#!/usr/bin/env node
/**
 * ng-packagr copies packages/angular/package.json into dist/ verbatim, so the
 * `workspace:` and `catalog:` protocols pnpm would normally rewrite at publish
 * time survive into the tarball and make it uninstallable. We publish that dist
 * manifest with plain `npm publish`, so rewrite it here first.
 */
import fs from 'node:fs';
import path from 'node:path';

import {
  ROOT,
  loadPackages,
  loadCatalog,
  resolveWorkspaceProtocol,
} from './lib/workspace.mjs';

const manifestPath = path.join(ROOT, 'packages/angular/dist/package.json');
if (!fs.existsSync(manifestPath)) {
  console.error(
    `✗ ${path.relative(ROOT, manifestPath)} not found — build @dayflow/angular first.`
  );
  process.exit(1);
}

const versions = new Map(loadPackages().map(p => [p.name, p.version]));
const catalog = loadCatalog();
const pkg = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const rewrites = [];

for (const section of [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
]) {
  for (const [dep, range] of Object.entries(pkg[section] ?? {})) {
    let resolved = null;

    if (String(range).startsWith('workspace:')) {
      const depVersion = versions.get(dep);
      if (!depVersion) {
        console.error(
          `✗ ${dep} uses "${range}" but is not a workspace package.`
        );
        process.exit(1);
      }
      resolved = resolveWorkspaceProtocol(range, depVersion);
    } else if (String(range).startsWith('catalog:')) {
      resolved = catalog[dep];
      if (!resolved) {
        console.error(
          `✗ ${dep} uses "${range}" but has no pnpm-workspace.yaml catalog entry.`
        );
        process.exit(1);
      }
    }

    if (resolved) {
      pkg[section][dep] = resolved;
      rewrites.push(`${section}.${dep}: ${range} -> ${resolved}`);
    }
  }
}

// Vite/esbuild resolve the ESM entry through the "import" condition, which
// ng-packagr does not emit.
const dot = pkg.exports?.['.'];
if (dot && typeof dot === 'object') {
  const target = dot.default || dot.esm2022;
  if (!dot.import && target) {
    dot.import = target;
    rewrites.push(`exports["."].import: added -> ${target}`);
  }
  // Conditions are matched first to last, and "default" matches everything, so
  // any key placed after it is dead. Appending "import" above would land it
  // there; keep "default" last.
  const keys = Object.keys(dot);
  if ('default' in dot && keys.at(-1) !== 'default') {
    const { default: fallback, ...rest } = dot;
    pkg.exports['.'] = { ...rest, default: fallback };
    rewrites.push('exports["."]: moved "default" to the end');
  }
}

fs.writeFileSync(manifestPath, JSON.stringify(pkg, null, 2) + '\n');

const remaining = fs.readFileSync(manifestPath, 'utf8');
if (remaining.includes('workspace:') || remaining.includes('catalog:')) {
  console.error(
    '✗ an unresolved workspace:/catalog: range survived the rewrite.'
  );
  process.exit(1);
}

console.log(
  rewrites.length
    ? `  patched dist/package.json\n${rewrites.map(r => `    ${r}`).join('\n')}`
    : '  dist/package.json needed no changes'
);

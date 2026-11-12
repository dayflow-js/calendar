#!/usr/bin/env node
/**
 * Publish preflight: catches the ways a partial release can strand consumers.
 *
 *   pnpm run check:deps            # audit what publish.sh would publish
 *   pnpm run check:deps --all      # audit every package, published or not
 *   pnpm run check:deps --offline  # skip registry lookups
 *   pnpm run check:deps --mode main    # only what `publish.sh main` would push
 *   pnpm run check:deps --manifest-only  # skip checks that need dist/
 *   pnpm run check:deps --json
 *
 * Exits non-zero when it finds an error, so publish.sh can gate on it.
 */
import fs from 'node:fs';
import path from 'node:path';

import { satisfies, isExactPin, gt } from './lib/semver-lite.mjs';
import {
  ROOT,
  loadPackages,
  prefetchNpmInfo,
  isInternal,
  workspaceNameSet,
  isBuiltin,
  packageNameOf,
  readDistImports,
  readDistTypeImports,
  latestPublished,
  publishedVersions,
  latestPublishedInternalRanges,
  changeStatus,
  dependencyDrift,
} from './lib/workspace.mjs';

const argv = process.argv.slice(2);
const OFFLINE = argv.includes('--offline');
const AUDIT_ALL = argv.includes('--all');
const AS_JSON = argv.includes('--json');
/** Skip checks that need a build, so preflight can run before the build phase. */
const MANIFEST_ONLY = argv.includes('--manifest-only');
const MODE = (() => {
  const i = argv.indexOf('--mode');
  return i !== -1 && argv[i + 1] ? argv[i + 1] : 'all';
})();

/** Mirrors the package groupings in publish.sh. */
const MODE_MEMBERS = {
  all: null, // every package
  main: ['@dayflow/core', '@dayflow/react', '@dayflow/vue', '@dayflow/svelte'],
  angular: ['@dayflow/angular'],
  plugins: null, // resolved by family below
  ui: null,
  caldav: null,
  cli: null,
};
const MODE_FAMILY = {
  plugins: 'plugins',
  ui: 'ui',
  caldav: 'caldav',
  cli: 'cli',
};

if (!(MODE in MODE_MEMBERS)) {
  console.error(
    `unknown --mode "${MODE}" (expected: ${Object.keys(MODE_MEMBERS).join(', ')})`
  );
  process.exit(2);
}

const C =
  process.stdout.isTTY && !AS_JSON
    ? {
        red: '\u001B[0;31m',
        green: '\u001B[0;32m',
        yellow: '\u001B[1;33m',
        cyan: '\u001B[0;36m',
        dim: '\u001B[2m',
        bold: '\u001B[1m',
        off: '\u001B[0m',
      }
    : { red: '', green: '', yellow: '', cyan: '', dim: '', bold: '', off: '' };

const findings = [];
const add = (severity, code, pkg, message, hint) =>
  findings.push({ severity, code, pkg, message, hint });
const error = (...a) => add('error', ...a);
const warn = (...a) => add('warn', ...a);

// ------------------------------------------------------------------- catalog

/** Flat `catalog:` map from pnpm-workspace.yaml, for resolving "catalog:" ranges. */
function loadCatalog() {
  const file = path.join(ROOT, 'pnpm-workspace.yaml');
  const catalog = {};
  if (!fs.existsSync(file)) return catalog;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let inCatalog = false;
  for (const line of lines) {
    if (/^catalog:\s*$/.test(line)) {
      inCatalog = true;
      continue;
    }
    if (inCatalog && /^\S/.test(line)) break; // dedented out of the block
    if (!inCatalog) continue;
    const m = /^\s+'?([^':\s]+)'?:\s*'?([^'\s#]+)'?/.exec(line);
    if (m) catalog[m[1]] = m[2];
  }
  return catalog;
}

const CATALOG = loadCatalog();

/** Resolve the protocol ranges pnpm rewrites at publish time. */
function resolveRange(range, depName, depLocalVersion) {
  const r = String(range);
  if (r.startsWith('catalog:')) {
    const key = r.slice('catalog:'.length).trim();
    const resolved = CATALOG[key === '' ? depName : depName];
    return resolved ?? null;
  }
  if (r === 'workspace:^')
    return depLocalVersion ? `^${depLocalVersion}` : null;
  if (r === 'workspace:~')
    return depLocalVersion ? `~${depLocalVersion}` : null;
  if (r === 'workspace:*') return depLocalVersion ?? null;
  if (r.startsWith('workspace:')) return r.slice('workspace:'.length);
  return r;
}

// ------------------------------------------------------------------ load data

const packages = loadPackages();
const byName = new Map(packages.map(p => [p.name, p]));
const WORKSPACE = workspaceNameSet(packages);

/** A `bin`-only package ships templates as string literals; scanning its
 *  bundle for import specifiers yields the templates, not real dependencies. */
const isTemplateCli = p =>
  p.manifest.bin &&
  !p.manifest.main &&
  !p.manifest.module &&
  !p.manifest.exports;

const registry = new Map(); // name -> { latest, versions }
if (!OFFLINE) {
  // One concurrent warm-up instead of a serial round trip per package.
  await prefetchNpmInfo(
    packages.map(p => p.name),
    (done, total) => {
      if (!process.stderr.isTTY || AS_JSON) return;
      process.stderr.write(
        `\r${C.dim}Fetching registry metadata ${done}/${total}${C.off}`
      );
      if (done === total) process.stderr.write('\r' + ' '.repeat(44) + '\r');
    }
  );

  for (const p of packages) {
    registry.set(p.name, {
      latest: latestPublished(p.name),
      versions: publishedVersions(p.name),
    });
  }
}
const reg = name => registry.get(name) ?? { latest: null, versions: [] };

/** Packages publish.sh would actually push: local version not yet on npm. */
function inMode(p) {
  if (MODE === 'all') return true;
  if (MODE_FAMILY[MODE]) return p.family === MODE_FAMILY[MODE];
  return MODE_MEMBERS[MODE].includes(p.name);
}

function computePublishSet() {
  const candidates = packages.filter(inMode);
  if (AUDIT_ALL || OFFLINE) return new Set(candidates.map(p => p.name));
  // publish.sh skips any package whose version is already on the registry.
  return new Set(
    candidates
      .filter(p => !reg(p.name).versions.includes(p.version))
      .map(p => p.name)
  );
}
const publishSet = computePublishSet();

/** The version of `name` that consumers will see after this publish run. */
function versionAfterPublish(name) {
  const local = byName.get(name);
  if (local && publishSet.has(name)) return local.version;
  const latest = reg(name).latest;
  if (latest) return latest;
  return local ? local.version : null;
}

// --------------------------------------------------------------------- checks

/** E01 — a `workspace:` range that survives into the tarball is uninstallable. */
function checkWorkspaceLeak(p) {
  if (MANIFEST_ONLY) return;
  const publishManifest = path.join(p.absPublishDir, 'package.json');
  if (p.absPublishDir === p.absDir || !fs.existsSync(publishManifest)) return;
  const raw = fs.readFileSync(publishManifest, 'utf8');
  if (raw.includes('workspace:')) {
    error(
      'E01',
      p.name,
      `${path.relative(ROOT, publishManifest)} still contains a "workspace:" range`,
      'This manifest is published verbatim — rewrite the range before publishing.'
    );
  }
}

/** E02 / W01 — does the built bundle's import list match the declared deps? */
function checkImportsVsManifest(p) {
  if (MANIFEST_ONLY || isTemplateCli(p)) return;

  const imports = readDistImports(p);
  if (imports === null) {
    warn(
      'W04',
      p.name,
      'not built — skipped import/dependency cross-check',
      'Run the build first so preflight can inspect dist/.'
    );
    return;
  }

  const declared = new Map(p.deps.map(d => [d.name, d]));
  const importedPkgs = new Set();
  for (const spec of imports) {
    if (isBuiltin(spec)) continue;
    importedPkgs.add(packageNameOf(spec));
  }

  // E02: imported at runtime but never declared -> resolves only by hoisting luck.
  for (const depName of importedPkgs) {
    if (depName === p.name) continue;
    if (declared.has(depName)) continue;
    const inDev = p.manifest.devDependencies?.[depName] !== undefined;
    error(
      'E02',
      p.name,
      `dist imports "${depName}" but it is not in dependencies/peerDependencies`,
      inDev
        ? `It is only a devDependency. npm and pnpm resolve it by hoisting luck; yarn PnP refuses ("isn't declared in its dependencies"). Promote it to dependencies.`
        : `It resolves only by hoisting luck, and yarn PnP refuses it outright. Declare it.`
    );
  }

  // E08: the declaration files are shipped too, and the JS bundle says nothing
  // about them — a package can be inlined into the JS yet still be imported by
  // the .d.ts that re-exports its types.
  const typeImports = readDistTypeImports(p) ?? new Set();
  const typePkgs = new Set();
  for (const spec of typeImports) {
    if (isBuiltin(spec)) continue;
    const name = packageNameOf(spec);
    typePkgs.add(name);
    if (name === p.name || declared.has(name)) continue;
    const alias =
      !byName.has(name) && p.manifest.devDependencies?.[name] === undefined;
    error(
      'E08',
      p.name,
      `declaration files import "${name}" but it is not in dependencies/peerDependencies`,
      alias
        ? `"${name}" looks like a tsconfig path alias that was never rewritten. Consumers get TS2307, or with skipLibCheck the affected types silently become any. Resolve the alias when bundling declarations.`
        : `Consumers get TS2307 "Cannot find module", or with skipLibCheck the affected types silently become any. Declare it as a dependency.`
    );
  }

  // W01: declared as a runtime dependency but neither the bundle nor the
  // declaration files reach for it. A package the .d.ts imports is not dead,
  // even when its code is inlined — the types still need it installed.
  for (const d of p.deps) {
    if (d.section !== 'dependencies') continue;
    if (importedPkgs.has(d.name) || typePkgs.has(d.name)) continue;
    warn(
      'W01',
      p.name,
      `declares dependency "${d.name}" that neither the bundle nor its declarations import`,
      'Consumers download a copy they never load, and shipping a fix to that package will not reach them without republishing this one. Move it to devDependencies, or mark it external.'
    );
  }
}

/** E03 / E05 — will every internal range resolve after this publish? */
function checkInternalRanges(p) {
  for (const d of p.deps) {
    if (!isInternal(d.name, WORKSPACE)) continue;
    const dep = byName.get(d.name);
    const depVersion = versionAfterPublish(d.name);
    const range = resolveRange(d.range, d.name, dep?.version);

    if (range === null) {
      warn(
        'W05',
        p.name,
        `cannot resolve range "${d.range}" for ${d.name}`,
        'Preflight could not verify this dependency.'
      );
      continue;
    }
    if (!depVersion) {
      error(
        'E05',
        p.name,
        `depends on ${d.name}, which is not published and not in this publish set`,
        'Publish it first, or add it to this run.'
      );
      continue;
    }
    if (!satisfies(depVersion, range)) {
      error(
        'E03',
        p.name,
        `${d.section} "${d.name}": "${d.range}" -> ${range} does not accept ${d.name}@${depVersion}`,
        'Consumers cannot install these two together.'
      );
    }
    if (isExactPin(range) && byName.has(d.name)) {
      warn(
        'W03',
        p.name,
        `${d.section} "${d.name}" is pinned to exactly ${range}`,
        'Any release of that package forces a matching release here. Use workspace:^ instead.'
      );
    }
  }
}

/**
 * E04 — the "publish A, break B" check.
 * For each package already on npm that we are NOT republishing, does its
 * live manifest still accept the versions this run is about to push?
 */
function checkPublishedDependents() {
  if (OFFLINE) return;
  for (const p of packages) {
    if (publishSet.has(p.name)) continue; // its new manifest supersedes the old one
    const live = latestPublishedInternalRanges(p.name, WORKSPACE);
    if (!live) continue;

    for (const d of live.ranges) {
      const target = byName.get(d.name);
      if (!target || !publishSet.has(d.name)) continue;

      const newVersion = target.version;
      const oldVersion = reg(d.name).latest;
      if (satisfies(newVersion, d.range)) continue;

      const stillWorksOnOld = oldVersion && satisfies(oldVersion, d.range);
      const localRange = resolveRange(
        p.deps.find(x => x.name === d.name)?.range ?? '',
        d.name,
        target.version
      );
      const localWouldAccept = localRange && satisfies(newVersion, localRange);

      error(
        'E04',
        p.name,
        `published ${p.name}@${live.version} requires ${d.name} "${d.range}", which rejects the incoming ${d.name}@${newVersion}`,
        localWouldAccept
          ? `The working tree already loosens this to "${localRange}". Republish ${p.name} in the same run so consumers get the loosened range.`
          : stillWorksOnOld
            ? `Consumers stay stuck on ${d.name}@${oldVersion}. Loosen the range and republish ${p.name}.`
            : `Loosen the range and republish ${p.name}.`
      );
    }
  }
}

/**
 * E07 / W07 — core's runtime re-declared by a package built on it.
 *
 * `@dayflow/core` ships its runtime (preact, temporal-polyfill, …) as plain
 * dependencies, so consumers never install it themselves. Re-declaring one of
 * those as a PEER hands it back to the consumer: yarn warns "doesn't provide
 * preact", yarn PnP refuses to resolve it, and users end up adding Preact to
 * their own package.json. That shipped in 3.7.1 and was reported by a user.
 *
 * A plain dependency is right, but only with core's range: a diverging range can
 * install a second copy, and a second Preact breaks hooks while a second
 * temporal-polyfill breaks brand checks on Temporal values passed to core.
 */
function checkSharedRuntime(p) {
  const core = byName.get('@dayflow/core');
  if (!core || p.name === core.name) return;
  if (!p.deps.some(d => d.name === core.name)) return; // not built on core

  const runtime = core.manifest.dependencies ?? {};
  for (const d of p.deps) {
    if (!(d.name in runtime) || WORKSPACE.has(d.name)) continue;
    const coreRange = resolveRange(runtime[d.name], d.name, null);

    if (d.section === 'peerDependencies') {
      error(
        'E07',
        p.name,
        `declares "${d.name}" as a peer, but @dayflow/core already ships it as a dependency`,
        `That makes every consumer install ${d.name} themselves: yarn warns "doesn't provide ${d.name}" and yarn PnP will not resolve it. Move it to dependencies as "catalog:" (${coreRange}).`
      );
      continue;
    }

    const ownRange = resolveRange(d.range, d.name, null);
    if (
      d.section === 'dependencies' &&
      coreRange &&
      ownRange &&
      ownRange !== coreRange
    ) {
      warn(
        'W07',
        p.name,
        `depends on "${d.name}" ${ownRange} while @dayflow/core uses ${coreRange}`,
        `Diverging ranges can install a second copy alongside core's. Use "catalog:" so both publish the same range.`
      );
    }
  }
}

/** E06 / W02 — version bookkeeping against the registry. */
function checkVersionBookkeeping(p) {
  if (OFFLINE) return;
  const { latest, versions } = reg(p.name);
  if (!latest) return;

  if (gt(latest, p.version)) {
    error(
      'E06',
      p.name,
      `local version ${p.version} is older than the published ${latest}`,
      'The publish would be rejected or would ship a downgrade.'
    );
    return;
  }
  if (versions.includes(p.version)) {
    const drift = dependencyDrift(p, packages);
    if (drift.length > 0) {
      warn(
        'W06',
        p.name,
        `declares dependency ranges that differ from the published ${latest}`,
        `Consumers keep the old ranges until this is republished: ${drift
          .map(d => `${d.dep} ${d.from} -> ${d.to}`)
          .join('; ')}. Bump it.`
      );
    }

    const status = changeStatus(p);
    if (status.changed) {
      warn(
        'W02',
        p.name,
        `has ${status.files.length} source change(s) since ${status.basis}, but version ${p.version} is already published`,
        `publish.sh will silently skip it and consumers keep the stale build. Bump it. (e.g. ${status.files
          .slice(0, 2)
          .map(f => path.basename(f))
          .join(', ')}${status.files.length > 2 ? ', …' : ''})`
      );
    }
  }
}

// ----------------------------------------------------------------------- run

// Per-package checks are scoped to the packages this run would touch.
for (const p of packages.filter(inMode)) {
  checkWorkspaceLeak(p);
  checkImportsVsManifest(p);
  checkInternalRanges(p);
  checkSharedRuntime(p);
  checkVersionBookkeeping(p);
}
// This one is deliberately global: it asks what the packages we are *not*
// republishing will make of the versions we are about to push.
checkPublishedDependents();

// -------------------------------------------------------------------- report

const errors = findings.filter(f => f.severity === 'error');
const warns = findings.filter(f => f.severity === 'warn');

if (AS_JSON) {
  console.log(
    JSON.stringify(
      {
        publishSet: [...publishSet].toSorted(),
        errors,
        warnings: warns,
      },
      null,
      2
    )
  );
  process.exit(errors.length ? 1 : 0);
}

const modeNote = [
  MODE === 'all' ? null : `mode: ${MODE}`,
  MANIFEST_ONLY ? 'manifest-only' : null,
  OFFLINE ? 'offline' : null,
]
  .filter(Boolean)
  .join(', ');
console.log(
  `${C.bold}Dependency preflight${C.off}${modeNote ? `${C.dim} (${modeNote})${C.off}` : ''}`
);
const setList = [...publishSet].toSorted();
console.log(
  `${C.dim}publish set (${setList.length}/${packages.length}): ${setList.length ? setList.join(', ') : '(nothing to publish)'}${C.off}\n`
);

function render(list, color, label) {
  if (!list.length) return;
  console.log(`${color}${C.bold}${label} (${list.length})${C.off}`);
  const grouped = new Map();
  for (const f of list) {
    if (!grouped.has(f.pkg)) grouped.set(f.pkg, []);
    grouped.get(f.pkg).push(f);
  }
  for (const [pkg, items] of grouped) {
    console.log(`\n  ${C.bold}${pkg}${C.off}`);
    for (const f of items) {
      console.log(`    ${color}[${f.code}]${C.off} ${f.message}`);
      if (f.hint) console.log(`          ${C.dim}${f.hint}${C.off}`);
    }
  }
  console.log('');
}

render(errors, C.red, 'ERRORS');
render(warns, C.yellow, 'WARNINGS');

if (!errors.length && !warns.length) {
  console.log(`${C.green}${C.bold}✓ no dependency problems found${C.off}`);
} else {
  console.log(
    `${errors.length ? C.red : C.green}${errors.length} error(s)${C.off}, ` +
      `${warns.length ? C.yellow : C.green}${warns.length} warning(s)${C.off}`
  );
}
process.exit(errors.length ? 1 : 0);

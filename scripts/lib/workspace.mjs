import { execFile, execFileSync } from 'node:child_process';
/**
 * Workspace introspection shared by check-deps.mjs and update-versions.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { isExactPin, maxVersion, satisfies } from './semver-lite.mjs';

export const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');

/**
 * Release families. Membership is derived from the directory layout so new
 * packages are classified without editing a list.
 *
 * `lockstep: true` means every member is bumped and republished together even
 * when only one of them changed — the adapters advertise "same version as core"
 * as their compatibility contract, so we keep that promise.
 */
export const FAMILIES = {
  core: {
    label: 'core + framework adapters',
    lockstep: true,
    publishMode: 'main',
  },
  plugins: { label: 'plugins', lockstep: false, publishMode: 'plugins' },
  ui: { label: 'ui components', lockstep: false, publishMode: 'ui' },
  caldav: { label: 'caldav / sync', lockstep: false, publishMode: 'caldav' },
  cli: { label: 'create-dayflow CLI', lockstep: false, publishMode: 'cli' },
};

function familyOf(relDir) {
  if (relDir.startsWith('packages/plugins/')) return 'plugins';
  if (relDir.startsWith('packages/ui/')) return 'ui';
  if (relDir.startsWith('packages/caldav/')) return 'caldav';
  if (relDir === 'packages/create-dayflow') return 'cli';
  return 'core';
}

/** Files that exist only to build/test the package and never ship. */
const NON_SHIPPING = [
  ':!**/package.json',
  ':!**/README*',
  ':!**/LICENSE',
  ':!**/CHANGELOG*',
  ':!**/*.test.*',
  ':!**/*.spec.*',
  ':!**/__tests__/**',
  ':!**/__mocks__/**',
  ':!**/vitest.config.*',
  ':!**/vitest.setup.*',
  ':!**/vitest.workspace.*',
  ':!**/jest.config.*',
  ':!**/jest.setup.*',
  ':!**/setupTests.*',
  ':!**/tsconfig.test.json',
  ':!**/tsconfig.spec.json',
];

export function git(args, { allowFail = false } = {}) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch (e) {
    if (allowFail) return '';
    throw e;
  }
}

export function loadPackages() {
  const out = execFileSync(
    'find',
    [
      'packages',
      '-name',
      'package.json',
      '-not',
      '-path',
      '*/node_modules/*',
      '-not',
      '-path',
      '*/dist/*',
    ],
    { cwd: ROOT, encoding: 'utf8' }
  )
    .trim()
    .split('\n')
    .filter(Boolean);

  const packages = [];
  for (const rel of out) {
    const manifestPath = path.join(ROOT, rel);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (!manifest.name || !manifest.version || manifest.private) continue;

    const relDir = path.dirname(rel);
    // ng-packagr emits the real publishable manifest into dist/.
    const publishRelDir =
      manifest.name === '@dayflow/angular' ? `${relDir}/dist` : relDir;

    const deps = [];
    for (const section of [
      'dependencies',
      'peerDependencies',
      'optionalDependencies',
    ]) {
      for (const [depName, range] of Object.entries(manifest[section] ?? {})) {
        deps.push({ name: depName, range, section });
      }
    }

    packages.push({
      name: manifest.name,
      version: manifest.version,
      dir: relDir,
      publishDir: publishRelDir,
      absDir: path.join(ROOT, relDir),
      absPublishDir: path.join(ROOT, publishRelDir),
      manifestPath,
      manifest,
      family: familyOf(relDir),
      deps,
      files: manifest.files ?? null,
    });
  }
  packages.sort((a, b) => a.name.localeCompare(b.name));
  return packages;
}

/**
 * True when `depName` is built in this workspace.
 * Scope is not a reliable signal: @dayflow/blossom-color-picker is published
 * under our scope but maintained outside this repo.
 */
export function isInternal(depName, workspaceNames) {
  return workspaceNames.has(depName);
}

/** Names of every publishable workspace package. */
export function workspaceNameSet(packages = loadPackages()) {
  return new Set(packages.map(p => p.name));
}

const BUILTIN = new Set((await import('node:module')).builtinModules);

export function isBuiltin(spec) {
  const bare = spec.replace(/^node:/, '');
  return spec.startsWith('node:') || BUILTIN.has(bare);
}

/** "@scope/pkg/sub/path" -> "@scope/pkg"; "pkg/sub" -> "pkg" */
export function packageNameOf(spec) {
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

const JS_EXT = new Set(['.js', '.mjs', '.cjs']);

function walk(dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (JS_EXT.has(path.extname(e.name))) acc.push(p);
  }
  return acc;
}

/**
 * Bare module specifiers the built output actually imports at runtime.
 * Returns null when the package has not been built yet.
 */
const DECLARATION_FILE = /\.d\.(m|c)?ts$/;

function walkFiles(dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules') walkFiles(p, acc);
    } else acc.push(p);
  }
  return acc;
}

/**
 * Bare specifiers the published declaration files reference.
 *
 * Kept separate from readDistImports because the two ship to different
 * consumers: the JS bundle can inline a package whose types it still re-exports,
 * and then only the declarations reach for it. @dayflow/core did exactly that in
 * 3.7.1: its bundle inlined the ui-* packages, they were moved to
 * devDependencies, and every consumer's TypeScript lost ContextMenu,
 * DayflowRangePicker and RangePickerProps. Returns null when nothing is built.
 */
export function readDistTypeImports(pkg) {
  const roots = [
    pkg.name === '@dayflow/angular'
      ? pkg.absPublishDir
      : path.join(pkg.absDir, 'dist'),
  ];
  // A "types" entry that lives outside dist/ (the Svelte adapter) ships too.
  for (const entry of [pkg.manifest.types, pkg.manifest.typings]) {
    if (entry && !entry.startsWith('dist/') && !entry.startsWith('./dist/')) {
      roots.push(path.join(pkg.absPublishDir, entry));
    }
  }

  const files = roots
    .flatMap(r => {
      if (!fs.existsSync(r)) return [];
      return fs.statSync(r).isDirectory() ? walkFiles(r) : [r];
    })
    .filter(f => DECLARATION_FILE.test(f));
  if (files.length === 0) return null;

  const specs = new Set();
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /<reference\s+types\s*=\s*["']([^"']+)["']/g,
  ];
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    for (const re of patterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(src)) !== null) {
        const spec = m[1];
        if (/^[./#]/.test(spec) || /^(data|https?):/.test(spec)) continue;
        if (spec.endsWith('.css')) continue;
        specs.add(spec);
      }
    }
  }
  return specs;
}

export function readDistImports(pkg) {
  const distDir =
    pkg.name === '@dayflow/angular'
      ? pkg.absPublishDir
      : path.join(pkg.absDir, 'dist');
  if (!fs.existsSync(distDir)) return null;

  const files = walk(distDir);
  if (files.length === 0) return null;

  const specs = new Set();
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\bexport\s*(?:\*|\{[^}]*\})\s*from\s*["']([^"']+)["']/g,
  ];
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    for (const re of patterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(src)) !== null) {
        const spec = m[1];
        if (
          spec.startsWith('.') ||
          spec.startsWith('/') ||
          spec.startsWith('#')
        )
          continue;
        if (spec.startsWith('data:') || spec.startsWith('http')) continue;
        specs.add(spec);
      }
    }
  }
  return specs;
}

// ---------------------------------------------------------------- npm registry

const npmCache = new Map();

/** Full `npm view` payload for a package, or null when never published. */
export function npmInfo(name) {
  if (npmCache.has(name)) return npmCache.get(name);
  let info = null;
  try {
    const raw = execFileSync('npm', ['view', name, '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    info = JSON.parse(raw);
    if (Array.isArray(info)) info = info.at(-1);
  } catch {
    info = null; // 404 = never published
  }
  npmCache.set(name, info);
  return info;
}

const execFileAsync = promisify(execFile);

/**
 * Warm the registry cache for many packages at once.
 *
 * Every other registry helper here is synchronous, which is what the rest of
 * the tooling wants — but run back to back that is one network round trip per
 * package, and the wait dominates every command. Fetching them concurrently up
 * front turns ~11s into ~1s and leaves the sync helpers as cache hits.
 *
 * @param {string[]} names Package names to fetch.
 * @param {(done:number,total:number)=>void} [onProgress] Called after each fetch.
 */
export async function prefetchNpmInfo(names, onProgress) {
  const pending = names.filter(n => !npmCache.has(n));
  let done = names.length - pending.length;
  onProgress?.(done, names.length);
  if (pending.length === 0) return;

  let cursor = 0;
  const worker = async () => {
    while (cursor < pending.length) {
      const name = pending[cursor++];
      let info = null;
      try {
        const { stdout } = await execFileAsync(
          'npm',
          ['view', name, '--json'],
          {
            maxBuffer: 32 * 1024 * 1024,
          }
        );
        info = JSON.parse(stdout);
        if (Array.isArray(info)) info = info.at(-1);
      } catch {
        info = null; // 404 = never published
      }
      npmCache.set(name, info);
      done += 1;
      onProgress?.(done, names.length);
    }
  };

  // Enough parallelism to hide the latency without opening a flood of sockets.
  const lanes = Math.min(8, pending.length);
  await Promise.all(Array.from({ length: lanes }, worker));
}

export function publishedVersions(name) {
  const info = npmInfo(name);
  if (!info) return [];
  return Array.isArray(info.versions) ? info.versions : [info.version];
}

export function latestPublished(name) {
  const info = npmInfo(name);
  if (!info) return null;
  return info['dist-tags']?.latest ?? maxVersion(publishedVersions(name));
}

/** Declared @dayflow/* ranges of the currently published `latest` of a package. */
export function latestPublishedInternalRanges(name, workspaceNames) {
  const info = npmInfo(name);
  if (!info) return null;
  const ranges = [];
  for (const section of [
    'dependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    for (const [depName, range] of Object.entries(info[section] ?? {})) {
      if (isInternal(depName, workspaceNames))
        ranges.push({ name: depName, range, section });
    }
  }
  return { version: info['dist-tags']?.latest ?? info.version, ranges };
}

// ------------------------------------------------------------ change detection

/**
 * The commit that set this package's version to `version`.
 * Used as the "last release" baseline, which is more precise than the repo-wide
 * tag because non-core families are not tagged at all.
 */
export function versionCommit(pkg, version) {
  const needle = `"version": "${version}"`;
  const out = git(
    ['log', '--format=%H', '-S', needle, '--', `${pkg.dir}/package.json`],
    { allowFail: true }
  );
  const first = out.split('\n').find(Boolean);
  return first || null;
}

/** Latest `v*` tag, used as a fallback baseline. */
export function latestReleaseTag() {
  const out = git(['tag', '--list', 'v*', '--sort=-v:refname'], {
    allowFail: true,
  });
  return out.split('\n').find(Boolean) || null;
}

/**
 * Shipping-source files changed in this package since `baseRef`.
 * Excludes manifests, docs and tests, which never reach the tarball's runtime.
 */
export function changedFilesSince(pkg, baseRef) {
  if (!baseRef) return null;
  const out = git(
    ['diff', '--name-only', baseRef, 'HEAD', '--', pkg.dir, ...NON_SHIPPING],
    { allowFail: true }
  );
  return out.split('\n').filter(Boolean);
}

/**
 * @returns {{changed:boolean|null, baseRef:string|null, files:string[], basis:string}}
 *   `changed: null` means we could not establish a baseline.
 */
/**
 * The baseline a package would be compared against on its own: the commit that
 * set its manifest to the version currently on npm, falling back to the newest
 * release tag.
 */
export function autoBaseline(pkg) {
  const published = latestPublished(pkg.name);
  if (published) {
    const commit = versionCommit(pkg, published);
    if (commit) return { baseRef: commit, basis: `${pkg.name}@${published}` };
  }
  const tag = latestReleaseTag();
  if (tag) return { baseRef: tag, basis: `tag ${tag}` };
  return { baseRef: null, basis: 'no baseline' };
}

/**
 * @param {object} pkg Package record from loadPackages().
 * @param {string|null} overrideBaseRef A caller-chosen baseline that wins over
 *   the per-package one, used by the commit-range release flow. The
 *   per-package baseline is still returned as `auto` so callers can show the
 *   gap between the two.
 * @returns {object} Change status, with `changed: null` when no baseline exists.
 */
export function changeStatus(pkg, overrideBaseRef = null) {
  const auto = autoBaseline(pkg);
  const baseRef = overrideBaseRef ?? auto.baseRef;
  const basis = overrideBaseRef
    ? `chosen commit ${overrideBaseRef.slice(0, 7)}`
    : auto.basis;

  if (!baseRef) {
    return {
      changed: null,
      baseRef: null,
      files: [],
      basis: 'no baseline',
      auto,
    };
  }

  const files = changedFilesSince(pkg, baseRef) ?? [];
  return { changed: files.length > 0, baseRef, files, basis, auto };
}

// -------------------------------------------------- publish-time range rewrite

/** Flat `catalog:` map from pnpm-workspace.yaml. */
export function loadCatalog() {
  const file = path.join(ROOT, 'pnpm-workspace.yaml');
  const catalog = {};
  if (!fs.existsSync(file)) return catalog;
  let inCatalog = false;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
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

/**
 * What pnpm writes into the tarball for a `workspace:` range.
 * Returns null when `range` is not a workspace protocol.
 */
export function resolveWorkspaceProtocol(range, depVersion) {
  const r = String(range);
  if (!r.startsWith('workspace:')) return null;
  const spec = r.slice('workspace:'.length);
  if (spec === '*') return depVersion;
  if (spec === '^') return `^${depVersion}`;
  if (spec === '~') return `~${depVersion}`;
  return spec; // workspace:>=1.2.0 and friends pass through
}

// ------------------------------------------------------------ bundle analysis

const SRC_EXT = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.svelte',
  '.vue',
]);
const TEST_PATH = /(^|\/)(__tests__|__mocks__)\/|\.(test|spec)\.[^/]+$/;

function walkSource(dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules') walkSource(p, acc);
    } else if (SRC_EXT.has(path.extname(e.name)) && !TEST_PATH.test(p)) {
      acc.push(p);
    }
  }
  return acc;
}

const BARE_IMPORT_PATTERNS = [
  /\bfrom\s*["']([^"']+)["']/g,
  /\bimport\s*["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
];

/**
 * Drop imports erased at compile time. A type-only import never reaches the
 * bundle, so counting it would read every type dependency as "inlined".
 */
function stripTypeOnlyImports(source) {
  return source
    .replaceAll(
      /\b(?:import|export)\s+type\s+[^;\n]*?from\s*["'][^"']+["']/g,
      ''
    )
    .replaceAll(
      /\bimport\s*\{([^}]*)\}\s*from\s*["'][^"']+["']/g,
      (match, bindings) => {
        const parts = bindings
          .split(',')
          .map(b => b.trim())
          .filter(Boolean);
        const allTypes =
          parts.length > 0 && parts.every(b => /^type\s/.test(b));
        return allTypes ? '' : match;
      }
    );
}

function bareSpecifiers(rawSource) {
  const source = stripTypeOnlyImports(rawSource);
  const specs = new Set();
  for (const re of BARE_IMPORT_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(source)) !== null) {
      const spec = m[1];
      if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('#'))
        continue;
      if (spec.startsWith('data:') || spec.startsWith('http')) continue;
      specs.add(spec);
    }
  }
  return specs;
}

/** Bare specifiers the package's shipping source imports. Excludes tests. */
export function readSourceImports(pkg) {
  const srcDir = path.join(pkg.absDir, 'src');
  if (!fs.existsSync(srcDir)) return null;
  const specs = new Set();
  for (const file of walkSource(srcDir)) {
    for (const spec of bareSpecifiers(fs.readFileSync(file, 'utf8')))
      specs.add(spec);
  }
  return specs;
}

/**
 * Workspace packages whose code is inlined into this package's bundle:
 * the source imports them, the built output does not.
 *
 * Deliberately independent of which manifest section they sit in — a bundled
 * dependency is correctly declared as a devDependency, so keying off
 * `dependencies` would miss exactly the cases we care about. Consumers get a
 * frozen copy, so a fix in the bundled package only reaches them when the
 * bundling package is republished too.
 */
export function bundledWorkspaceDeps(pkg, workspaceNames) {
  const dist = readDistImports(pkg);
  const src = readSourceImports(pkg);
  if (!dist || !src) return [];
  const distPkgs = new Set([...dist].map(packageNameOf));
  return [...new Set([...src].map(packageNameOf))].filter(
    name => name !== pkg.name && workspaceNames.has(name) && !distPkgs.has(name)
  );
}

// ----------------------------------------------------------- commit selection

/** Unit separator: safe as a git --format delimiter, never appears in a subject. */
const FIELD_SEP = String.fromCodePoint(31);

/** True when `a` is an ancestor of `b` (or the same commit). */
export function isAncestor(a, b) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', a, b], {
      cwd: ROOT,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

/** Resolve a ref to a full sha, or null when it does not exist. */
export function resolveRef(ref) {
  const out = git(['rev-parse', '--verify', `${ref}^{commit}`], {
    allowFail: true,
  });
  return out || null;
}

/**
 * The diff base for "release everything from `ref` onwards".
 * The user names an inclusive starting commit, so we diff against its parent.
 * A root commit has no parent, so fall back to git's empty tree.
 */
export function inclusiveBase(ref) {
  const parent = git(['rev-parse', '--verify', `${ref}^`], { allowFail: true });
  return parent || '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
}

/** Publishable package dirs a commit touches, compared against its first parent. */
function packageDirsTouched(sha) {
  const parent = git(['rev-parse', '--verify', `${sha}^`], { allowFail: true });
  const files = parent
    ? git(['diff', '--name-only', parent, sha, '--', 'packages'], {
        allowFail: true,
      })
    : git(['show', '--pretty=', '--name-only', sha, '--', 'packages'], {
        allowFail: true,
      });

  const dirs = new Set();
  for (const f of files.split('\n').filter(Boolean)) {
    const parts = f.split('/');
    if (parts[0] !== 'packages') continue;
    const nested = ['plugins', 'ui', 'caldav'].includes(parts[1]);
    dirs.add(
      nested ? `packages/${parts[1]}/${parts[2]}` : `packages/${parts[1]}`
    );
  }
  return [...dirs];
}

/**
 * Recent history, annotated with the packages each commit touches.
 * That annotation is what makes a commit list usable for deciding where to cut
 * a release — a subject line alone does not say what shipped.
 */
export function recentCommits(limit = 20) {
  // Deliberately not --first-parent. Work lands here through PR merges, so a
  // first-parent walk hides every commit that describes what changed and
  // leaves a list of "Merge pull request #NNN" rows you cannot choose between.
  const raw = git(
    [
      'log',
      `-n${limit}`,
      `--format=%H${FIELD_SEP}%h${FIELD_SEP}%ad${FIELD_SEP}%s${FIELD_SEP}%P`,
      '--date=short',
    ],
    { allowFail: true }
  );
  return raw
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [sha, short, date, subject, parents] = line.split(FIELD_SEP);
      return {
        sha,
        short,
        date,
        subject,
        isMerge: (parents ?? '').trim().split(/\s+/).filter(Boolean).length > 1,
        packageDirs: packageDirsTouched(sha),
      };
    });
}

/**
 * Commit a release tag points at, so the picker can show where the previous
 * release ended and which commits are still unreleased.
 */
export function latestReleaseTagCommit() {
  const tag = latestReleaseTag();
  if (!tag) return null;
  const sha = resolveRef(tag);
  return sha ? { tag, sha } : null;
}

/** Commits between two refs that touch a package's shipping source. */
export function commitsTouching(pkg, fromRef, toRef) {
  const raw = git(
    [
      'log',
      `--format=%h${FIELD_SEP}%ad${FIELD_SEP}%s`,
      '--date=short',
      `${fromRef}..${toRef}`,
      '--',
      pkg.dir,
      ...NON_SHIPPING,
    ],
    { allowFail: true }
  );
  return raw
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [short, date, subject] = line.split(FIELD_SEP);
      return { short, date, subject };
    });
}

/**
 * Uncommitted changes, split by whether they sit inside a publishable package.
 * Change detection diffs committed history, so anything under `inPackages` is
 * invisible to it and would ship without being accounted for.
 */
export function workingTreeChanges(packages) {
  const raw = git(['status', '--porcelain', '--untracked-files=normal'], {
    allowFail: true,
  });
  const inPackages = [];
  const elsewhere = [];
  for (const line of raw.split('\n').filter(Boolean)) {
    // Porcelain v1: two status characters, a space, then the path.
    const file = line.slice(3).replace(/^"(.*)"$/, '$1');
    const owner = packages.find(p => file.startsWith(`${p.dir}/`));
    if (owner) inPackages.push({ file, pkg: owner.name });
    else elsewhere.push({ file, pkg: null });
  }
  return {
    inPackages,
    elsewhere,
    dirty: inPackages.length + elsewhere.length > 0,
  };
}

// ------------------------------------------------------------ manifest drift

/** The range pnpm would write into the tarball for a declared range. */
export function resolvePublishRange(range, depName, depVersion, catalog) {
  const workspace = resolveWorkspaceProtocol(range, depVersion);
  if (workspace) return workspace;
  if (String(range).startsWith('catalog:')) return catalog[depName] ?? null;
  return String(range);
}

const DRIFT_SECTIONS = [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
];

/**
 * Dependency ranges that differ between the local manifest and the one on npm.
 *
 * Git-based change detection deliberately ignores package.json — otherwise every
 * version bump would look like a change — which makes a package whose *only*
 * edit is a dependency range invisible to it. Those edits are exactly the ones
 * consumers feel, so they are detected here instead, by comparing against what
 * is actually published rather than against history.
 *
 * @returns {Array<{section:string,dep:string,from:string,to:string}>} One entry per range that differs; empty when the manifest matches npm.
 */
export function dependencyDrift(pkg, packages) {
  const info = npmInfo(pkg.name);
  if (!info) return []; // never published: nothing to drift from

  // When a build tool generates the published manifest (ng-packagr injects
  // tslib), deps it adds are not "removed" just because the authored manifest
  // lacks them. Without that generated file we cannot tell, so skip removals.
  const generated = pkg.absPublishDir !== pkg.absDir;
  const generatedPath = path.join(pkg.absPublishDir, 'package.json');
  const shippedManifest =
    generated && fs.existsSync(generatedPath)
      ? JSON.parse(fs.readFileSync(generatedPath, 'utf8'))
      : null;

  const localVersions = new Map(packages.map(dep => [dep.name, dep.version]));
  const catalog = loadCatalog();
  const drift = [];

  for (const section of DRIFT_SECTIONS) {
    const authored = pkg.manifest[section] ?? {};
    const shipped = shippedManifest?.[section] ?? {};
    const published = info[section] ?? {};

    for (const [dep, range] of Object.entries(authored)) {
      const onNpm = published[dep];
      const willPublish = resolvePublishRange(
        range,
        dep,
        localVersions.get(dep),
        catalog
      );

      if (String(range).startsWith('workspace:')) {
        const depVersion = latestPublished(dep) ?? localVersions.get(dep);
        if (!workspaceRangeHolds(range, onNpm, depVersion)) {
          drift.push({
            section,
            dep,
            from: onNpm ?? '(absent)',
            to: willPublish ?? range,
          });
        }
        continue;
      }

      if (willPublish === null) continue; // unresolvable, do not guess
      if (onNpm !== willPublish) {
        drift.push({
          section,
          dep,
          from: onNpm ?? '(absent)',
          to: willPublish,
        });
      }
    }

    if (generated && !shippedManifest) continue;
    for (const dep of Object.keys(published)) {
      if (!(dep in authored) && !(dep in shipped)) {
        drift.push({ section, dep, from: published[dep], to: '(removed)' });
      }
    }
  }
  return drift;
}

/**
 * Does a published range still honour a floating `workspace:` spec?
 *
 * `workspace:^` publishes as `^<dependency version at that moment>`, so the
 * literal range on npm goes stale the moment the dependency moves: a package
 * published with `^3.7.1` is not "drifted" because core is now 3.7.2 — that is
 * the same authored intent, and it still admits 3.7.2. Comparing literals made
 * every untouched dependent look changed after each core release.
 *
 * What does count: a different shape (an exact pin where a caret is declared
 * now — the 3.7.0 -> 3.7.1 transition), or a range that no longer admits the
 * dependency at all (a major bump).
 */
export function workspaceRangeHolds(spec, publishedRange, depVersion) {
  if (publishedRange === undefined) return false; // newly declared
  const kind = String(spec).slice('workspace:'.length);
  const range = String(publishedRange).trim();

  let shapeHolds;
  if (kind === '^') shapeHolds = range.startsWith('^');
  else if (kind === '~') shapeHolds = range.startsWith('~');
  else if (kind === '*') shapeHolds = isExactPin(range);
  else return range === kind; // workspace:<explicit range> publishes verbatim

  if (!shapeHolds) return false;
  if (!depVersion) return true;
  try {
    return satisfies(depVersion, range);
  } catch {
    return true; // a range we cannot model: do not invent drift
  }
}

#!/usr/bin/env node
/**
 * Version bumper.
 *
 * Bumps only what actually changed since each package was last published,
 * instead of moving every manifest in lockstep. The one exception is the
 * `core` family (core + framework adapters), which ships as a matched set:
 * "@dayflow/react@X works with @dayflow/core@X" is a contract users rely on.
 *
 * By default each package is compared against its own last-published commit.
 * You can instead nominate a starting commit — "this release is everything from
 * here on" — and the two are cross-checked: anything that fell out of range is
 * reported before it can be dropped silently.
 *
 *   pnpm run version:update                 # interactive
 *   pnpm run version:update --dry-run       # show the plan, change nothing
 *   pnpm run version:update --since db89bf5 # release from this commit onwards
 *   pnpm run version:update --auto --patch --yes
 *   pnpm run version:update --minor --family core --yes
 *   pnpm run version:update --all           # ignore change detection entirely
 */
import fs from 'node:fs';
import readline from 'node:readline';

import { gt, maxVersion } from './lib/semver-lite.mjs';
import {
  autoBaseline,
  bundledWorkspaceDeps,
  changeStatus,
  commitsTouching,
  dependencyDrift,
  FAMILIES,
  inclusiveBase,
  isAncestor,
  latestPublished,
  loadPackages,
  prefetchNpmInfo,
  latestReleaseTagCommit,
  recentCommits,
  resolveRef,
  workingTreeChanges,
  workspaceNameSet,
} from './lib/workspace.mjs';

const argv = process.argv.slice(2);
const has = f => argv.includes(f);
const valueOf = f => {
  const i = argv.indexOf(f);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--')
    ? argv[i + 1]
    : null;
};

const DRY_RUN = has('--dry-run');
const ASSUME_YES = has('--yes') || has('-y');
const FORCE_ALL = has('--all');
const FORCE_AUTO = has('--auto');
const CLI_SINCE = valueOf('--since');
const COMMIT_LIMIT = Number(valueOf('--limit') ?? 15);
const CLI_BUMP = has('--major')
  ? 'MAJOR'
  : has('--minor')
    ? 'MINOR'
    : has('--patch')
      ? 'PATCH'
      : null;
const CLI_FAMILY = valueOf('--family');

const INTERACTIVE = process.stdin.isTTY && !ASSUME_YES;

const ESC = String.fromCodePoint(27);
const C = process.stdout.isTTY
  ? {
      red: `${ESC}[0;31m`,
      green: `${ESC}[0;32m`,
      yellow: `${ESC}[1;33m`,
      cyan: `${ESC}[0;36m`,
      dim: `${ESC}[2m`,
      bold: `${ESC}[1m`,
      off: `${ESC}[0m`,
    }
  : { red: '', green: '', yellow: '', cyan: '', dim: '', bold: '', off: '' };

function fail(message) {
  console.error(`${C.red}${message}${C.off}`);
  process.exit(2);
}

function bump(version, type) {
  const [maj, min, pat] = version.split('.').map(Number);
  if ([maj, min, pat].some(Number.isNaN)) {
    throw new Error(`unparseable version: ${version}`);
  }
  if (type === 'MAJOR') return `${maj + 1}.0.0`;
  if (type === 'MINOR') return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

/** Arrow-key picker on stderr, so stdout stays pipeable. */
function select(title, options) {
  return new Promise((resolve, reject) => {
    const { stdin, stderr } = process;
    if (!stdin.isTTY) {
      reject(new Error('not a TTY'));
      return;
    }

    let index = 0;
    stderr.write('\n'.repeat(options.length + 1));
    const render = () => {
      readline.moveCursor(stderr, 0, -(options.length + 1));
      readline.clearScreenDown(stderr);
      stderr.write(`${title}\n`);
      for (const [i, opt] of options.entries()) {
        stderr.write(
          i === index ? `${C.cyan}> ${opt.label}${C.off}\n` : `  ${opt.label}\n`
        );
      }
    };

    readline.emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();
    render();

    const cleanup = () => {
      stdin.off('keypress', onKey);
      stdin.setRawMode(false);
      stdin.pause();
    };
    const onKey = (_str, key) => {
      if (!key) return;
      if (key.ctrl && key.name === 'c') {
        cleanup();
        reject(new Error('cancelled'));
      } else if (key.name === 'up') {
        index = (index - 1 + options.length) % options.length;
        render();
      } else if (key.name === 'down') {
        index = (index + 1) % options.length;
        render();
      } else if (key.name === 'return') {
        cleanup();
        resolve(options[index].value);
      }
    };
    stdin.on('keypress', onKey);
  });
}

/**
 * Single-line counter for work that would otherwise look like a hang.
 * Rewrites in place on a TTY; prints one line when piped.
 */
function progress(label) {
  let started = false;
  return (done, total) => {
    if (!process.stderr.isTTY) {
      if (!started) {
        process.stderr.write(`${label} (${total})…\n`);
        started = true;
      }
      return;
    }
    const bars = Math.round((done / total) * 20);
    const bar = '#'.repeat(bars) + '.'.repeat(20 - bars);
    process.stderr.write(
      `\r${C.dim}${label} [${bar}] ${done}/${total}${C.off}`
    );
    if (done === total) process.stderr.write('\n');
  };
}

// ------------------------------------------------------------------- packages

const packages = loadPackages();
const WORKSPACE = workspaceNameSet(packages);
const shortName = name => name.replace('@dayflow/', '');
const dirToName = new Map(packages.map(p => [p.dir, p.name]));

// -------------------------------------------------------------- working tree

/**
 * Change detection diffs committed history, so uncommitted edits inside a
 * package are invisible to it: the package can look unchanged and get skipped
 * while its edits still sit in the tree the build will use.
 */
async function checkWorkingTree() {
  const { inPackages, elsewhere } = workingTreeChanges(packages);
  if (elsewhere.length > 0 && inPackages.length === 0) {
    console.log(
      `${C.dim}${elsewhere.length} uncommitted file(s) outside packages/ — not relevant to version detection.${C.off}\n`
    );
    return;
  }
  if (inPackages.length === 0) return;

  const byPkg = new Map();
  for (const { file, pkg } of inPackages) {
    if (!byPkg.has(pkg)) byPkg.set(pkg, []);
    byPkg.get(pkg).push(file);
  }

  console.log(
    `${C.yellow}${C.bold}Uncommitted changes in ${byPkg.size} package(s)${C.off}`
  );
  console.log(
    `${C.dim}Change detection reads committed history, so these are NOT counted as changes.${C.off}`
  );
  for (const [pkg, files] of byPkg) {
    const shown = files.slice(0, 3).map(f => f.split('/').pop());
    const more = files.length > 3 ? `, +${files.length - 3} more` : '';
    console.log(
      `  ${shortName(pkg).padEnd(26)} ${C.dim}${shown.join(', ')}${more}${C.off}`
    );
  }
  console.log(
    `${C.dim}Fine when they are scratch files or edits already published; a problem when they are real changes.${C.off}`
  );

  if (!INTERACTIVE) {
    console.log(`${C.dim}Non-interactive run — continuing.${C.off}\n`);
    return;
  }

  const go = await select(`\n${C.bold}Continue anyway?${C.off}`, [
    { label: 'Continue', value: true },
    { label: 'Abort (commit or stash first)', value: false },
  ]);
  if (!go) {
    console.log(`\n${C.yellow}Aborted.${C.off}`);
    process.exit(0);
  }
  console.log('');
}

// ------------------------------------------------------------------ baseline

/** @returns {Promise<string|null>} Chosen diff base, or null for per-package auto. */
async function resolveBaseline() {
  if (FORCE_ALL) return null;

  if (CLI_SINCE) {
    const sha = resolveRef(CLI_SINCE);
    if (!sha)
      fail(`--since "${CLI_SINCE}" is not a commit this repository knows.`);
    console.log(
      `${C.bold}Release range${C.off} ${C.dim}from ${CLI_SINCE} (${sha.slice(0, 7)}) to HEAD${C.off}\n`
    );
    return inclusiveBase(sha);
  }

  if (FORCE_AUTO || !INTERACTIVE) return null;

  const mode = await select(
    `${C.bold}How should "changed" be decided?${C.off}`,
    [
      {
        label: 'Per package, since each was last published  (default)',
        value: 'auto',
      },
      { label: 'From a commit I pick, onwards', value: 'pick' },
    ]
  );
  if (mode === 'auto') return null;

  const commits = recentCommits(COMMIT_LIMIT);
  if (commits.length === 0) fail('No commits found.');

  // Everything at or below the last release tag is already shipped; dim it so
  // the unreleased commits — the ones worth cutting at — stand out.
  const release = latestReleaseTagCommit();
  const releaseIndex = release
    ? commits.findIndex(c => c.sha === release.sha)
    : -1;

  const options = commits.map((c, i) => {
    const names = c.packageDirs
      .map(d => dirToName.get(d))
      .filter(Boolean)
      .map(shortName);
    const shown = names.slice(0, 4).join(', ');
    const more = names.length > 4 ? `, +${names.length - 4}` : '';
    const tag =
      names.length > 0 ? `[${shown}${more}]` : `${C.dim}[no packages]${C.off}`;
    const subject = (c.subject ?? '').slice(0, 44).padEnd(46);
    const marker =
      releaseIndex !== -1 && i === releaseIndex
        ? `  ${C.cyan}<- ${release.tag}${C.off}`
        : '';
    const released = releaseIndex !== -1 && i >= releaseIndex;
    const row = `${c.short}  ${c.date}  ${subject}${tag}${marker}`;
    return { label: released ? `${C.dim}${row}${C.off}` : row, value: c };
  });

  const unreleased = releaseIndex === -1 ? commits.length : releaseIndex;
  const hint =
    releaseIndex === -1
      ? '(inclusive)'
      : `(inclusive — ${unreleased} commit${unreleased === 1 ? '' : 's'} since ${release.tag})`;
  const chosen = await select(
    `${C.bold}Release starts at which commit?${C.off} ${C.dim}${hint}${C.off}`,
    options
  );
  console.log(
    `\n${C.bold}Release range${C.off} ${C.dim}from ${chosen.short} to HEAD${C.off}`
  );
  return inclusiveBase(chosen.sha);
}

// --------------------------------------------------------------- cross-check

/**
 * A chosen starting commit is a scope decision; each package's own last-publish
 * commit is the fact. When the choice sits later than that fact, real unshipped
 * work falls in the gap — and publish.sh skips a package whose version is
 * already on npm, so that work would never reach anyone.
 *
 * @returns {Promise<Map<string,string|null>>} Per-package baseline overrides.
 */
async function crossCheck(chosenBase) {
  const perPackage = new Map(packages.map(p => [p.name, chosenBase]));
  if (!chosenBase) return perPackage;

  // Several git walks per package, so report progress rather than going quiet.
  const tick = progress('Comparing against each package last release');
  const gaps = [];
  let scanned = 0;
  tick(0, packages.length);
  for (const p of packages) {
    const auto = autoBaseline(p);
    if (auto.baseRef) {
      // Only a chosen base *later* than a package's own baseline loses history.
      const later =
        isAncestor(auto.baseRef, chosenBase) &&
        !isAncestor(chosenBase, auto.baseRef);
      if (later) {
        const missed = commitsTouching(p, auto.baseRef, chosenBase);
        if (missed.length > 0) gaps.push({ pkg: p, auto, missed });
      }
    }
    tick(++scanned, packages.length);
  }

  if (gaps.length === 0) {
    console.log(
      `${C.green}Range covers every package's unpublished work.${C.off}\n`
    );
    return perPackage;
  }

  console.log(
    `\n${C.yellow}${C.bold}${gaps.length} package(s) have unpublished work before your starting commit${C.off}`
  );
  for (const { pkg, auto, missed } of gaps) {
    console.log(
      `\n  ${C.bold}${pkg.name}${C.off} ${C.dim}last published at ${auto.basis}${C.off}`
    );
    for (const c of missed.slice(0, 5)) {
      console.log(`    ${C.dim}${c.short}  ${c.date}  ${c.subject}${C.off}`);
    }
    if (missed.length > 5)
      console.log(`    ${C.dim}… +${missed.length - 5} more${C.off}`);
  }
  console.log(
    `\n${C.dim}Leaving them out ships nothing for those packages: publish.sh skips versions already on npm.${C.off}`
  );

  if (!INTERACTIVE) {
    fail(
      '\nRefusing to drop unpublished work in a non-interactive run. Re-run interactively, or widen --since.'
    );
  }

  const choice = await select(
    `\n${C.bold}What should happen to them?${C.off}`,
    [
      {
        label: `Include them (use each package's own baseline)  [${gaps.length} package(s)]`,
        value: 'include',
      },
      { label: 'Leave them out — I know they should not ship', value: 'skip' },
      { label: 'Abort', value: 'abort' },
    ]
  );

  if (choice === 'abort') {
    console.log(`\n${C.yellow}Aborted.${C.off}`);
    process.exit(0);
  }
  if (choice === 'include') {
    for (const { pkg, auto } of gaps) perPackage.set(pkg.name, auto.baseRef);
    console.log(
      `\n${C.green}Widened baseline for ${gaps.length} package(s).${C.off}`
    );
  }
  console.log('');
  return perPackage;
}

// ------------------------------------------------------------------- analysis

// Warm the registry cache before anything reads it: every later step needs it,
// and fetching serially on demand is what made this feel like a stall.
await prefetchNpmInfo(
  packages.map(p => p.name),
  progress('Fetching registry metadata')
);

await checkWorkingTree();
const chosenBase = await resolveBaseline();
const baselines = await crossCheck(chosenBase);

console.log(`${C.bold}Analyzing packages…${C.off}\n`);

const state = new Map();
for (const p of packages) {
  const published = latestPublished(p.name);
  const status = FORCE_ALL
    ? { changed: true, basis: '--all' }
    : changeStatus(p, baselines.get(p.name) ?? null);
  // A manifest-only edit (a loosened range, a newly declared peer) never shows
  // up in a git diff we deliberately filter package.json out of, so ask the
  // registry what it currently serves instead.
  const drift = FORCE_ALL ? [] : dependencyDrift(p, packages);
  const reasons = [];
  if (status.changed === true) reasons.push('own source changed');
  if (drift.length > 0) {
    reasons.push(
      `published deps differ (${[...new Set(drift.map(d => d.dep.replace('@dayflow/', '')))].join(', ')})`
    );
  }

  // Local ahead of npm means this package was already bumped for the release
  // being prepared. Bumping again on a second run would skip a version number
  // and publish a hole, so treat it as staged rather than as more work.
  const staged = Boolean(published) && gt(p.version, published);

  state.set(p.name, {
    pkg: p,
    published,
    staged,
    changed: status.changed === true || drift.length > 0 || staged,
    unknown: status.changed === null && drift.length === 0,
    basis: status.basis,
    fileCount: status.files?.length ?? 0,
    reasons,
  });
}

// Propagate: a package that inlines a changed workspace dep is itself stale.
for (const p of packages) {
  for (const depName of bundledWorkspaceDeps(p, WORKSPACE)) {
    if (!state.get(depName)?.changed) continue;
    const self = state.get(p.name);
    if (!self.changed) self.changed = true;
    self.reasons.push(`bundles ${depName}, which changed`);
  }
}

// Lockstep families move as a unit once any member moves.
for (const [family, cfg] of Object.entries(FAMILIES)) {
  if (!cfg.lockstep) continue;
  const members = packages.filter(p => p.family === family);
  if (!members.some(m => state.get(m.name).changed)) continue;
  for (const m of members) {
    const self = state.get(m.name);
    if (!self.changed) {
      self.changed = true;
      self.reasons.push(`${family} family ships as a matched set`);
    }
  }
}

// ---------------------------------------------------------------------- plan

const familyOrder = Object.keys(FAMILIES);
const families = familyOrder
  .map(name => ({
    name,
    cfg: FAMILIES[name],
    members: packages.filter(p => p.family === name),
  }))
  .filter(f => f.members.length > 0)
  .filter(f => !CLI_FAMILY || f.name === CLI_FAMILY);

if (CLI_FAMILY && families.length === 0) {
  fail(
    `unknown --family "${CLI_FAMILY}" (expected: ${familyOrder.join(', ')})`
  );
}

for (const f of families) {
  const changed = f.members.filter(m => state.get(m.name).changed);
  const tag = f.cfg.lockstep ? `${C.dim}(lockstep)${C.off}` : '';
  console.log(`${C.bold}${f.name}${C.off} — ${f.cfg.label} ${tag}`);
  for (const m of f.members) {
    const st = state.get(m.name);
    const mark = st.staged
      ? `${C.cyan}v${C.off}`
      : st.changed
        ? `${C.yellow}*${C.off}`
        : `${C.dim}-${C.off}`;
    let note;
    if (st.staged) {
      note = `${C.cyan}already bumped from ${st.published} — pending publish${C.off}`;
    } else if (st.unknown) note = `${C.dim}no baseline${C.off}`;
    else if (st.changed) {
      const files = st.fileCount
        ? ` (${st.fileCount} file${st.fileCount > 1 ? 's' : ''})`
        : '';
      note = `${C.dim}${st.reasons.join('; ')}${files}${C.off}`;
    } else
      note = `${C.dim}unchanged since ${st.basis || 'last release'}${C.off}`;
    console.log(
      `  ${mark} ${m.name.padEnd(36)} ${m.version.padEnd(8)} ${note}`
    );
  }
  console.log(changed.length ? '' : `  ${C.dim}nothing to bump${C.off}\n`);
}

const actionable = families.filter(f =>
  f.members.some(m => state.get(m.name).changed)
);
if (actionable.length === 0) {
  console.log(
    `${C.green}Nothing changed in this range — no version bumps needed.${C.off}`
  );
  process.exit(0);
}

// ------------------------------------------------------------------- execute

const plan = []; // { pkg, from, to }

for (const f of actionable) {
  const candidates = f.cfg.lockstep
    ? f.members
    : f.members.filter(m => state.get(m.name).changed);
  // Whatever is already staged keeps the version it has.
  const members = candidates.filter(m => !state.get(m.name).staged);
  if (members.length === 0) continue;

  let type = CLI_BUMP;
  if (!type) {
    if (!INTERACTIVE)
      fail(
        'No prompt available — pass an explicit --patch, --minor or --major.'
      );
    type = await select(
      `${C.bold}Bump for "${f.name}" (${members.length} package${members.length > 1 ? 's' : ''})${C.off}`,
      [
        { label: 'PATCH', value: 'PATCH' },
        { label: 'MINOR', value: 'MINOR' },
        { label: 'MAJOR', value: 'MAJOR' },
        { label: 'SKIP this family', value: null },
      ]
    );
    if (type === null) continue;
  }

  // A lockstep family keeps one shared number line, so every member lands on
  // the same target even if one had drifted.
  // If part of a lockstep family is already staged, the rest catches up to that
  // version rather than the family jumping a release ahead of it.
  const stagedPeak = maxVersion(
    candidates.filter(m => state.get(m.name).staged).map(m => m.version)
  );
  const target = f.cfg.lockstep
    ? (stagedPeak ?? bump(maxVersion(candidates.map(m => m.version)), type))
    : null;

  for (const m of members) {
    plan.push({ pkg: m, from: m.version, to: target ?? bump(m.version, type) });
  }
}

if (plan.length === 0) {
  const staged = packages.filter(p => state.get(p.name).staged);
  if (staged.length > 0) {
    console.log(
      `\n${C.green}${staged.length} package(s) are already bumped and waiting to be published.${C.off}`
    );
    console.log(
      `${C.dim}Next: pnpm run check:deps && pnpm run publish:all${C.off}`
    );
  } else {
    console.log(`\n${C.yellow}No families selected — nothing changed.${C.off}`);
  }
  process.exit(0);
}

console.log(`\n${C.bold}Plan${C.off}`);
for (const item of plan) {
  console.log(
    `  ${item.pkg.name.padEnd(36)} ${item.from} ${C.cyan}->${C.off} ${item.to}`
  );
}

if (DRY_RUN) {
  console.log(`\n${C.yellow}--dry-run: no files written.${C.off}`);
  process.exit(0);
}

for (const item of plan) {
  const manifest = JSON.parse(fs.readFileSync(item.pkg.manifestPath, 'utf8'));
  manifest.version = item.to;
  fs.writeFileSync(
    item.pkg.manifestPath,
    JSON.stringify(manifest, null, 2) + '\n'
  );
}

console.log(`\n${C.green}${C.bold}Updated ${plan.length} package(s).${C.off}`);
console.log(
  `${C.dim}Next: pnpm run check:deps && pnpm run publish:all${C.off}`
);

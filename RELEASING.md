# Releasing

## Release families

Packages are grouped by directory. Each group has its own version line.

| Family    | Packages                                                                            | Versioning                       |
| --------- | ----------------------------------------------------------------------------------- | -------------------------------- |
| `core`    | `@dayflow/core`, `react`, `vue`, `svelte`, `angular`                                | **Lockstep** — all bump together |
| `plugins` | `plugin-drag`, `plugin-keyboard-shortcuts`, `plugin-localization`, `plugin-sidebar` | Only what changed                |
| `ui`      | `ui-context-menu`, `ui-range-picker`                                                | Only what changed                |
| `caldav`  | `caldav`, `sync-core`, `google-sync`, `outlook-sync`                                | Only what changed                |
| `cli`     | `create-dayflow`                                                                    | Only what changed                |

`core` stays in lockstep on purpose: "`@dayflow/react@X` pairs with `@dayflow/core@X`" is a
contract users rely on when picking versions for a multi-framework library. The adapters are
thin, so the cost is four extra publishes. Every other family gains nothing from lockstep, and
republishing an unchanged package just produces upgrade noise for consumers.

## Normal release

```bash
pnpm run version:update   # detects changes, bumps only what moved
pnpm run check:deps       # dependency audit (also runs inside publish.sh)
pnpm run build
pnpm run publish:all      # skips any package whose version is already on npm
pnpm run tag
```

`version:update` prints a plan before writing anything; `--dry-run` stops after the plan.
Non-interactive: `pnpm run version:update --auto --patch --yes`, optionally `--family plugins`.

### Choosing what counts as "this release"

By default every package is compared against its own last-published commit, found by locating
the commit that set its manifest to the version currently on npm.

You can instead nominate a starting commit — "this release is everything from here on":

```bash
pnpm run version:update --since db89bf5
```

Interactively, `version:update` offers a commit picker that annotates each commit with the
packages it touches, which is what you actually need in order to decide where to cut:

```
> db89bf5  2026-08-26  feat(core): event recurrence editor    [core]
  667dfde  2026-08-26  refactor(test): Jest to Vitest         [core, react, vue, svelte, +6]
  338797d  2026-08-27  Merge pull request #148                [no packages]
```

The commit you name is **inclusive**, so the diff runs against its parent.

**The choice is cross-checked, never taken on trust.** A starting commit is a scope decision;
each package's last-publish commit is a fact. If your commit sits later than some package's own
baseline, the work in between is listed before anything is written:

```
1 package(s) have unpublished work before your starting commit

  @dayflow/core last published at @dayflow/core@3.7.0
    db89bf5  2026-08-26  feat(core): implement event recurrence editor
```

You then choose to include those packages (each falls back to its own baseline), leave them out
deliberately, or abort. Dropping them silently would mean shipping nothing for them at all —
`publish.sh` skips any package whose version is already on npm — so a non-interactive run
refuses rather than guessing.

Do not judge a commit by its subject line. `667dfde` above is labelled `refactor(test)` but
also carries a real fix to the Vue and Svelte adapters. The picker tells you which packages a
commit touches; the cross-check tells you what you would lose.

### Manifest-only changes

Git-based detection ignores `package.json` — otherwise every version bump would look like a
change — which makes a package whose only edit is a dependency range invisible to it. Those
edits are caught separately, by comparing the local manifest against the one npm currently
serves. A loosened range or a newly declared peer therefore still triggers a bump.

### Re-running `version:update`

A package whose local version is already ahead of npm is treated as staged for the release
being prepared, not as more work. Running `version:update` twice therefore reports what is
waiting to be published instead of bumping a second time and leaving a hole in the version
sequence. Within a lockstep family, members that are not yet bumped catch up to the staged
version rather than the whole family jumping past it.

Manifest comparison follows the same principle: `workspace:` ranges are resolved against each
dependency's **published** version, not its local one. Otherwise bumping a shared package would
make every dependent look changed — `workspace:^` reading as `^3.7.1 -> ^3.7.2` — and selective
publishing would collapse back into publishing everything.

### Uncommitted changes

Change detection reads committed history, so edits sitting in the working tree are not counted.
`version:update` lists any that fall inside a publishable package and asks whether to continue —
harmless for scratch files, but a real change left uncommitted would ship with no version bump
behind it.

## Dependency rules

**Internal ranges use `workspace:^`**, never `workspace:*`. pnpm rewrites `workspace:*` into an
_exact_ pin at publish time, which forces every consumer to upgrade the whole set at once — and
makes releasing one package alone impossible. `workspace:^` publishes as `^X.Y.Z`.

**Peer versus bundled decides propagation:**

- A package that **peer-depends** on another does not need a republish when that other package
  changes — the `^` range covers it.
- A package that **bundles** another _does_ need a republish, because the consumer's copy is
  frozen inside the bundle. `version:update` detects this by comparing what the source imports
  against what the built output imports — a workspace package present in the first and absent
  from the second was inlined. Type-only imports are excluded, since they never reach the
  bundle. Today the only such pair is `@dayflow/core`, which inlines both `ui-*` packages.

**Inlined does not mean unneeded.** Core's JS inlines the `ui-*` code, but its declaration file
still re-exports their types (`ContextMenu*`, `DayflowRangePicker`, `RangePickerProps`,
`ZonedRange`). They therefore stay in `dependencies`: consumers' TypeScript has to find them.
Moving them to `devDependencies` in 3.7.1 broke those types — TS2307 with `skipLibCheck: false`,
and silently `any` with `skipLibCheck: true`, which is what most app templates use. `check:deps`
now reads the published `.d.ts` files as well as the bundle (`E08`).

**Anything a bundle imports must be declared — and core's runtime goes in `dependencies`, never
`peerDependencies`.** `@dayflow/core` ships `preact` and `temporal-polyfill` as plain
dependencies, so consumers never install them. A plugin that imports them has to declare them
the same way, with the same range (`catalog:`):

- **Undeclared** resolves only by hoisting. Yarn PnP rejects it: "isn't declared in its
  dependencies".
- **As a peer** makes it the consumer's job. Yarn warns "doesn't provide preact" and yarn PnP
  refuses to resolve it: "isn't provided by your application". Users end up adding Preact to
  their own `package.json`. This shipped in 3.7.1 for `plugin-drag` and `plugin-sidebar` and
  was reported by a user.
- **As a dependency with core's range** resolves everywhere, and package managers dedupe it to
  the single copy core uses. That matters: a second Preact breaks hooks, and a second
  `temporal-polyfill` breaks brand checks on Temporal values handed to core.

Verified by installing from npm under npm 11, pnpm 10 (with and without `auto-install-peers`)
and yarn 4 (PnP and `node-modules`). npm and pnpm tolerate all three forms; yarn is what tells
them apart. `check:deps` enforces the rule as `E07`.

## What `check:deps` reports

Errors block the publish; warnings do not.

| Code  | Meaning                                                                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E01` | A `workspace:`/`catalog:` range survived into a manifest that ships verbatim                                                                                                    |
| `E02` | The built bundle imports something the manifest never declares                                                                                                                  |
| `E03` | An internal range cannot be satisfied by the version being published                                                                                                            |
| `E04` | A package already on npm declares a range that rejects an incoming version — publishing would strand it                                                                         |
| `E05` | An internal dependency is neither published nor part of this run                                                                                                                |
| `E06` | The local version is older than what is on npm                                                                                                                                  |
| `W01` | A declared `dependencies` entry the bundle never imports (inlined or dead)                                                                                                      |
| `W02` | Source changed since the last publish but the version was not bumped — `publish.sh` would silently skip it                                                                      |
| `W03` | An internal range is an exact pin                                                                                                                                               |
| `W04` | Package not built, so the import cross-check was skipped                                                                                                                        |
| `W06` | Declared dependency ranges differ from the published manifest — consumers keep the old ranges until it is republished                                                           |
| `E07` | A package built on core declares one of core's runtime dependencies (`preact`, `temporal-polyfill`, …) as a peer — consumers are forced to install it                           |
| `E08` | A published declaration file imports a package that is not declared — often a tsconfig path alias that was never rewritten. Consumers get TS2307, or `any` under `skipLibCheck` |
| `W07` | A package built on core depends on one of core's runtime dependencies with a different range — risks a second copy                                                              |

Useful flags: `--mode <all\|main\|plugins\|ui\|caldav\|angular\|cli>`, `--manifest-only`
(skips checks needing `dist/`), `--all` (audit everything, not just the publish set),
`--offline`, `--json`.

`publish.sh` runs the audit twice: `--manifest-only` before the build so version and range
mistakes fail in seconds, and the full audit after the build but before anything reaches npm.
`--skip-checks` bypasses both.

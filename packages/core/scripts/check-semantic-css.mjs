import path from 'node:path';

import {
  diffAgainstBaseline,
  loadBaseline,
  parseArgs,
  scanSourceViolations,
  summarizeViolationsByFile,
  writeBaseline,
} from './atomic-css-guard-utils.mjs';

const args = parseArgs(process.argv.slice(2));
const shouldWriteBaseline = Boolean(args.get('--write-baseline'));

const violations = scanSourceViolations();
const summary = summarizeViolationsByFile(violations);
const baseline = loadBaseline();

if (shouldWriteBaseline) {
  writeBaseline({
    ...baseline,
    source: summary,
  });
  console.log(
    `[check-semantic-css] Updated source baseline with ${Object.keys(summary).length} files.`
  );
  process.exit(0);
}

const regressions = diffAgainstBaseline(summary, baseline.source ?? {});

if (regressions.length > 0) {
  console.error(
    '[check-semantic-css] Atomic CSS regressions detected in source files.'
  );
  console.error(
    'The guard allows existing baseline debt, but blocks any new internal atomic utility usage.'
  );
  console.error(
    'Allowed pass-through values such as `className={className}` are ignored; only literal internal class strings are counted.'
  );

  for (const regression of regressions) {
    console.error(
      `  - ${regression.file}: ${regression.count} violations (baseline ${regression.baseline})`
    );

    const details = violations
      .filter(violation => violation.file === regression.file)
      .slice(0, regression.count - regression.baseline + 3);

    for (const detail of details) {
      console.error(
        `      line ${detail.line}: ${detail.token}  <- ${detail.snippet}`
      );
    }
  }

  console.error();
  console.error(
    `If the increase is intentional during migration, update ${path.relative(process.cwd(), new URL('./atomic-css-baseline.json', import.meta.url).pathname)} after review.`
  );
  process.exit(1);
}

console.log(
  `[check-semantic-css] Source atomic CSS baseline respected (${violations.length} tracked matches across ${Object.keys(summary).length} files).`
);

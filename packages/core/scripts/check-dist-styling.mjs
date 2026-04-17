import fs from 'node:fs';
import path from 'node:path';

import {
  FORBIDDEN_TOP_LEVEL_UTILITY_SELECTORS,
  diffAgainstBaseline,
  isDayFlowSelector,
  loadBaseline,
  parseArgs,
  scanDistJsViolations,
  summarizeViolationsByFile,
  writeBaseline,
  workspaceRoot,
} from './atomic-css-guard-utils.mjs';

const args = parseArgs(process.argv.slice(2));
const packageRoot = path.resolve(
  String(args.get('--package-root') ?? process.cwd())
);
const shouldWriteBaseline = Boolean(args.get('--write-baseline'));

const packageName = path.relative(workspaceRoot, packageRoot) || '.';
const stylesComponentsPath = path.join(
  packageRoot,
  'dist',
  'styles.components.css'
);

function readCss(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dist CSS file not found: ${filePath}`);
  }

  return fs.readFileSync(filePath, 'utf8');
}

function checkComponentsCss(css) {
  const failures = [];

  for (const pattern of FORBIDDEN_TOP_LEVEL_UTILITY_SELECTORS) {
    if (new RegExp(pattern, 'm').test(css)) {
      failures.push(`Top-level utility selector detected: ${pattern}`);
    }
  }

  const topLevelSelectors = css
    .split('\n')
    .filter(line => /^\.[a-z]/.test(line.trim()))
    .map(line => line.trim());

  const violations = topLevelSelectors.filter(
    selector => !isDayFlowSelector(selector)
  );

  if (violations.length > 0) {
    failures.push(
      `Found non-namespaced top-level selectors: ${violations.slice(0, 10).join(', ')}`
    );
  }

  return failures;
}

const cssFailures = checkComponentsCss(readCss(stylesComponentsPath));

if (cssFailures.length > 0) {
  console.error(
    `[check-dist-styling] CSS contract violations detected for ${packageName}.`
  );
  for (const failure of cssFailures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

const jsViolations = scanDistJsViolations(packageRoot);
const jsSummary = summarizeViolationsByFile(jsViolations);
const baseline = loadBaseline();

if (shouldWriteBaseline) {
  writeBaseline({
    ...baseline,
    distJs: {
      ...baseline.distJs,
      ...jsSummary,
    },
  });
  console.log(
    `[check-dist-styling] Updated dist JS baseline for ${packageName} (${Object.keys(jsSummary).length} files).`
  );
  process.exit(0);
}

const jsRegressions = diffAgainstBaseline(jsSummary, baseline.distJs ?? {});

if (jsRegressions.length > 0) {
  console.error(
    `[check-dist-styling] Dist JS atomic CSS regressions detected for ${packageName}.`
  );
  console.error(
    'The dist guard blocks new atomic utility debt in published JS while allowing the current migration baseline.'
  );

  for (const regression of jsRegressions) {
    console.error(
      `  - ${regression.file}: ${regression.count} violations (baseline ${regression.baseline})`
    );
  }

  process.exit(1);
}

console.log(
  `[check-dist-styling] Dist CSS/JS contract respected for ${packageName}.`
);

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const coreRoot = path.resolve(__dirname, '..');
export const workspaceRoot = path.resolve(coreRoot, '..', '..');
export const baselineFile = path.join(__dirname, 'atomic-css-baseline.json');

export const SOURCE_SCAN_ROOTS = [
  { root: 'packages/core/src' },
  { root: 'packages/plugins', requireSegment: `${path.sep}src${path.sep}` },
  { root: 'packages/resource-grid/src' },
  { root: 'packages/ui', requireSegment: `${path.sep}src${path.sep}` },
];

export const FORBIDDEN_TOP_LEVEL_UTILITY_SELECTORS = [
  String.raw`^\.flex-col\s*\{`,
  String.raw`^\.flex-row\s*\{`,
  String.raw`^\.grid\s*\{`,
  String.raw`^\.md\\:flex-row\s*\{`,
  String.raw`^\.bg-background\s*\{`,
  String.raw`^\.bg-primary\s*\{`,
  String.raw`^\.text-primary\s*\{`,
  String.raw`^\.bg-secondary\s*\{`,
  String.raw`^\.border-border\s*\{`,
  String.raw`^\.ring-primary\s*\{`,
];

const SOURCE_FILE_PATTERN = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const DIST_JS_PATTERN = /\.(js|mjs|cjs)$/;
const EXCLUDED_SOURCE_PATTERNS = [
  /(?:^|\/)__tests__(?:\/|$)/,
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /\.d\.ts$/,
];

const RESPONSIVE_PREFIXES = new Set(['sm', 'md', 'lg', 'xl', '2xl']);
const STATE_PREFIXES = new Set([
  'dark',
  'hover',
  'focus',
  'focus-visible',
  'focus-within',
  'active',
  'disabled',
  'group-hover',
  'group-focus',
  'motion-safe',
  'motion-reduce',
  'aria-selected',
  'aria-expanded',
  'data-[state=open]',
]);

const EXACT_FORBIDDEN_TOKENS = new Set([
  'absolute',
  'aspect-square',
  'block',
  'contents',
  'cursor-pointer',
  'cursor-default',
  'fixed',
  'flex',
  'grid',
  'hidden',
  'inline-flex',
  'invisible',
  'overflow-auto',
  'overflow-hidden',
  'overflow-visible',
  'pointer-events-auto',
  'pointer-events-none',
  'relative',
  'select-none',
  'shrink-0',
  'snap-center',
  'snap-mandatory',
  'snap-y',
  'static',
  'sticky',
  'table',
  'truncate',
  'uppercase',
  'visible',
  'w-full',
  'whitespace-nowrap',
]);

const FORBIDDEN_PREFIXES = [
  'animate-',
  'aspect-',
  'backdrop-',
  'bg-',
  'border-',
  'bottom-',
  'break-',
  'content-',
  'cursor-',
  'duration-',
  'ease-',
  'fill-',
  'flex-',
  'font-',
  'gap-',
  'grid-',
  'h-',
  'inset-',
  'items-',
  'justify-',
  'leading-',
  'left-',
  'line-clamp-',
  'm-',
  'mb-',
  'ml-',
  'mr-',
  'mt-',
  'mx-',
  'my-',
  'max-h-',
  'max-w-',
  'min-h-',
  'min-w-',
  'object-',
  'opacity-',
  'origin-',
  'outline-',
  'overflow-',
  'overscroll-',
  'p-',
  'pb-',
  'pl-',
  'pr-',
  'pt-',
  'px-',
  'py-',
  'right-',
  'ring-',
  'rotate-',
  'rounded',
  'scale-',
  'shadow',
  'shrink-',
  'size-',
  'snap-',
  'space-x-',
  'space-y-',
  'stroke-',
  'text-',
  'top-',
  'tracking-',
  'transition',
  'translate-',
  'w-',
  'will-change-',
  'z-',
];

function collectFiles(dirPath, filterPattern) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs.readdirSync(dirPath, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(entryPath, filterPattern);
    }

    if (!filterPattern.test(entry.name)) {
      return [];
    }

    return [entryPath];
  });
}

export function isDayFlowSelector(selector) {
  return (
    selector.startsWith('.df-') ||
    selector.startsWith('.bcp-') ||
    selector.startsWith('.dark ')
  );
}

function stripComments(source) {
  return source
    .replaceAll(/\/\*[\s\S]*?\*\//g, ' ')
    .replaceAll(/(^|[^:])\/\/.*$/gm, '$1');
}

function shouldSkipSourceFile(filePath) {
  return EXCLUDED_SOURCE_PATTERNS.some(pattern => pattern.test(filePath));
}

function normalizeToken(token) {
  return token
    .trim()
    .replaceAll(/^[,;()[\]{}]+/g, '')
    .replaceAll(/[,;()[\]{}]+$/g, '');
}

function isAllowedToken(token) {
  return (
    token.startsWith('df-') ||
    token.startsWith('bcp-') ||
    token === 'calendar-event'
  );
}

function hasForbiddenVariant(token) {
  const prefix = token.split(':', 1)[0];
  return RESPONSIVE_PREFIXES.has(prefix) || STATE_PREFIXES.has(prefix);
}

function hasForbiddenPrefix(token) {
  return FORBIDDEN_PREFIXES.some(prefix => token.startsWith(prefix));
}

function isArbitraryUtility(token) {
  return /[[(].*[\])]/.test(token);
}

function looksLikeForbiddenClassToken(token) {
  if (!token || isAllowedToken(token)) {
    return false;
  }

  if (hasForbiddenVariant(token)) {
    return true;
  }

  if (EXACT_FORBIDDEN_TOKENS.has(token)) {
    return true;
  }

  if (hasForbiddenPrefix(token)) {
    return true;
  }

  return isArbitraryUtility(token);
}

function extractTokensFromText(text) {
  return text
    .replaceAll(/\$\{[\s\S]*?\}/g, ' ')
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean)
    .filter(looksLikeForbiddenClassToken);
}

function lineForIndex(source, index) {
  return source.slice(0, index).split('\n').length;
}

function scanStringLiterals(filePath, content) {
  const stripped = stripComments(content);
  const matches = [];
  const stringLiteralPattern = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;

  for (const match of stripped.matchAll(stringLiteralPattern)) {
    const [fullMatch, , inner] = match;
    if (!inner) continue;

    const tokens = extractTokensFromText(inner);
    if (tokens.length === 0) continue;

    const line = lineForIndex(stripped, match.index ?? 0);
    for (const token of tokens) {
      matches.push({
        file: path.relative(workspaceRoot, filePath),
        line,
        token,
        snippet: fullMatch.slice(0, 120),
      });
    }
  }

  return matches;
}

export function scanSourceViolations() {
  const files = SOURCE_SCAN_ROOTS.flatMap(target =>
    collectFiles(
      path.join(workspaceRoot, target.root),
      SOURCE_FILE_PATTERN
    ).filter(filePath =>
      target.requireSegment ? filePath.includes(target.requireSegment) : true
    )
  ).filter(filePath => !shouldSkipSourceFile(filePath));

  return files.flatMap(filePath =>
    scanStringLiterals(filePath, fs.readFileSync(filePath, 'utf8'))
  );
}

export function scanDistJsViolations(packageRoot) {
  const root = path.resolve(packageRoot);
  const distRoot = path.join(root, 'dist');
  const files = collectFiles(distRoot, DIST_JS_PATTERN).filter(
    filePath =>
      !filePath.endsWith('.d.ts') &&
      !filePath.includes(`${path.sep}dist${path.sep}build${path.sep}`)
  );

  return files.flatMap(filePath =>
    scanStringLiterals(filePath, fs.readFileSync(filePath, 'utf8')).map(
      violation => ({
        ...violation,
        file: path.relative(workspaceRoot, filePath),
      })
    )
  );
}

export function summarizeViolationsByFile(violations) {
  const summary = {};
  for (const violation of violations) {
    summary[violation.file] = (summary[violation.file] ?? 0) + 1;
  }
  return summary;
}

export function loadBaseline() {
  if (!fs.existsSync(baselineFile)) {
    return { source: {}, distJs: {} };
  }

  return JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
}

export function writeBaseline(baseline) {
  fs.writeFileSync(baselineFile, `${JSON.stringify(baseline, null, 2)}\n`);
}

export function diffAgainstBaseline(current, baselineSection) {
  return Object.entries(current)
    .map(([file, count]) => ({
      file,
      count,
      baseline: baselineSection[file] ?? 0,
    }))
    .filter(entry => entry.count > entry.baseline)
    .toSorted((left, right) => left.file.localeCompare(right.file));
}

export function parseArgs(argv) {
  const args = new Map();

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;

    const [key, inlineValue] = arg.split('=');
    if (inlineValue !== undefined) {
      args.set(key, inlineValue);
      continue;
    }

    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args.set(key, true);
      continue;
    }

    args.set(key, next);
    i += 1;
  }

  return args;
}

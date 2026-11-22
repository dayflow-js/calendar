#!/usr/bin/env node
/**
 * Rewrites `<html lang="en">` to the real locale in the exported HTML.
 *
 * The locale lives in the URL prefix (`/docs-zh`, `/docs-ja`, ...), not in a
 * dynamic route segment, so no layout receives it as a param. Only the root
 * layout renders `<html>`, and under `output: 'export'` there is no request to
 * read either -- so every translated page shipped as `lang="en"`, telling
 * crawlers a Chinese page was English and contradicting its own hreflang tags.
 *
 * Moving the docs under `/{locale}/docs` would let Next.js supply the locale,
 * but it would also change every indexed docs URL, which `lib/i18n.ts`
 * deliberately avoids. Rewriting the built HTML keeps the URLs and still ships
 * a correct `lang` in the markup, which is what crawlers read.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

// Kept in step with LOCALES in lib/i18n.ts. `en` is the default locale and
// already correct, so it is not listed here.
const TRANSLATED_LOCALES = ['zh', 'ja', 'es', 'fr', 'de', 'ko'];

const OUT_DIR = resolve(import.meta.dirname, '..', 'out');

async function htmlFilesUnder(dir) {
  const found = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return found;
    throw error;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await htmlFilesUnder(path)));
    else if (entry.name.endsWith('.html')) found.push(path);
  }
  return found;
}

let rewritten = 0;
const missing = [];

for (const locale of TRANSLATED_LOCALES) {
  const files = await htmlFilesUnder(join(OUT_DIR, `docs-${locale}`));
  if (files.length === 0) {
    missing.push(locale);
    continue;
  }

  let localeCount = 0;
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    // Only the opening <html> tag, and only when it still claims English.
    const next = html.replace(
      /(<html\b[^>]*?)\slang="en"/,
      `$1 lang="${locale}"`
    );
    if (next !== html) {
      await writeFile(file, next);
      localeCount++;
    }
  }

  if (localeCount === 0) missing.push(locale);
  rewritten += localeCount;
  console.log(
    `[html-lang] ${locale}: ${localeCount}/${files.length} page(s) set to lang="${locale}"`
  );
}

if (missing.length > 0) {
  console.error(
    `[html-lang] no page was rewritten for: ${missing.join(', ')}.\n` +
      '[html-lang] Either the export layout changed or the root layout no longer ' +
      'emits lang="en". Fix this script rather than shipping the wrong lang.'
  );
  process.exit(1);
}

console.log(`[html-lang] done, ${rewritten} page(s) rewritten.`);

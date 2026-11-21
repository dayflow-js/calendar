#!/usr/bin/env node
/**
 * Captures changelog screenshots from the website demo, in light and dark.
 *
 *   npm run dev                        # in another terminal
 *   npm run changelog:capture          # every shot in changelog/shots.json
 *   npm run changelog:capture tasks    # only the named shots
 *
 * Options: --base <url> (default http://localhost:3000), --chrome <path>.
 * Drives the installed Chrome over the DevTools protocol, so it needs no
 * extra dependencies. Images and their sizes go to public/images/changelog.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  closeChrome,
  connect,
  defaultChromePath,
  evaluate,
  launchChrome,
  sleep,
  waitFor,
} from './lib/chrome.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public/images/changelog');
const manifestPath = path.join(outDir, 'manifest.json');
const shots = JSON.parse(
  fs.readFileSync(path.join(root, 'changelog/shots.json'), 'utf8')
);

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args.splice(index, 2)[1];
};
const base = option('base', 'http://localhost:3000');
const chromePath = option('chrome', defaultChromePath);
const only = new Set(args);
const selected = shots.filter(shot => only.size === 0 || only.has(shot.name));
if (selected.length === 0) {
  console.error(`No shots named: ${[...only].join(', ')}`);
  process.exit(1);
}

async function runStep(cdp, step) {
  if (step.wait) await sleep(step.wait);
  if (step.waitFor) await waitFor(cdp, step.waitFor);
  if (step.click) {
    await waitFor(cdp, step.click);
    // Real mouse events, so pointer-based handlers fire like a user click.
    const box = await evaluate(
      cdp,
      `(() => {
        const el = document.querySelector(${JSON.stringify(step.click)});
        el.scrollIntoView({ block: 'center', inline: 'center' });
        const r = el.getBoundingClientRect();
        return { x: r.left + Math.min(r.width / 2, 24), y: r.top + r.height / 2 };
      })()`
    );
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await cdp.send('Input.dispatchMouseEvent', {
        type,
        ...box,
        button: 'left',
        clickCount: 1,
      });
    }
    await sleep(step.delay ?? 400);
  }
  if (step.eval) await evaluate(cdp, step.eval);
}

async function capture(cdp, shot, theme) {
  const viewport = { width: 1280, height: 860, ...shot.viewport };
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    ...viewport,
    deviceScaleFactor: 2,
    mobile: false,
  });
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: theme }],
  });
  const { identifier } = await cdp.send(
    'Page.addScriptToEvaluateOnNewDocument',
    {
      source: `localStorage.setItem('theme', '${theme}');
        addEventListener('DOMContentLoaded', () => {
          const style = document.createElement('style');
          style.textContent = 'nextjs-portal { display: none !important; } *, *::before, *::after { caret-color: transparent !important; }';
          document.head.append(style);
        });`,
    }
  );
  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', { url: new URL(shot.path, base).href });
  await loaded;
  await waitFor(cdp, '.df-calendar-container');
  await sleep(1200);
  for (const step of shot.steps ?? []) await runStep(cdp, step);
  await sleep(300);

  const clip = await evaluate(
    cdp,
    `(() => {
      const selectors = ${JSON.stringify([shot.clip ?? '.calendar-wrapper'].flat())};
      const rects = selectors
        .map(s => document.querySelector(s)?.getBoundingClientRect())
        .filter(Boolean);
      if (rects.length === 0) throw new Error('Nothing to clip: ' + selectors);
      const pad = ${shot.padding ?? 0};
      const left = Math.max(0, Math.min(...rects.map(r => r.left)) - pad);
      const top = Math.max(0, Math.min(...rects.map(r => r.top)) - pad);
      const right = Math.min(innerWidth, Math.max(...rects.map(r => r.right)) + pad);
      const bottom = Math.min(innerHeight, Math.max(...rects.map(r => r.bottom)) + pad);
      return {
        x: Math.round(left + scrollX),
        y: Math.round(top + scrollY),
        width: Math.round(right - left),
        height: Math.round(bottom - top),
      };
    })()`
  );
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'webp',
    quality: 86,
    clip: { ...clip, scale: 1 },
    captureBeyondViewport: false,
  });
  await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });

  const file = `${shot.name}${theme === 'dark' ? '-dark' : ''}.webp`;
  fs.writeFileSync(path.join(outDir, file), Buffer.from(data, 'base64'));
  return { file, width: clip.width * 2, height: clip.height * 2 };
}

const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : {};
fs.mkdirSync(outDir, { recursive: true });
const browser = await launchChrome(chromePath);
let failed = false;
try {
  const cdp = await connect(browser.wsUrl);
  await cdp.send('Page.enable');
  for (const shot of selected) {
    try {
      const light = await capture(cdp, shot, 'light');
      const dark = await capture(cdp, shot, 'dark');
      manifest[shot.name] = {
        width: light.width,
        height: light.height,
        alt: shot.alt,
      };
      console.log(
        `✓ ${shot.name}  ${light.width}×${light.height}  (${light.file}, ${dark.file})`
      );
    } catch (error) {
      failed = true;
      console.error(`✗ ${shot.name}: ${error.message}`);
    }
  }
  cdp.close();
} finally {
  await closeChrome(browser);
}
const sorted = Object.fromEntries(
  Object.entries(manifest).toSorted(([a], [b]) => a.localeCompare(b))
);
fs.writeFileSync(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`);
process.exit(failed ? 1 : 0);

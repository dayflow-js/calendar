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
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
const chromePath = option(
  'chrome',
  process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : 'google-chrome'
);
const only = new Set(args);
const selected = shots.filter(shot => only.size === 0 || only.has(shot.name));
if (selected.length === 0) {
  console.error(`No shots named: ${[...only].join(', ')}`);
  process.exit(1);
}

const sleep = ms =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

async function launchChrome() {
  const port = 9300 + Math.floor(Math.random() * 500);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dayflow-capture-'));
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const page = (await res.json()).find(target => target.type === 'page');
      if (page) return { chrome, profile, wsUrl: page.webSocketDebuggerUrl };
    } catch {
      // Chrome is still starting.
    }
    await sleep(100);
  }
  chrome.kill();
  throw new Error(`Chrome did not start: ${chromePath}`);
}

function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  const pending = new Map();
  const listeners = new Set();
  let id = 0;
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    } else if (message.method) {
      listeners.forEach(listener => listener(message));
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      id += 1;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const once = method =>
    new Promise(resolve => {
      const listener = message => {
        if (message.method !== method) return;
        listeners.delete(listener);
        resolve(message.params);
      };
      listeners.add(listener);
    });
  return new Promise((resolve, reject) => {
    socket.addEventListener('open', () =>
      resolve({ send, once, close: () => socket.close() })
    );
    socket.addEventListener('error', reject);
  });
}

async function evaluate(cdp, expression) {
  const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (exceptionDetails) {
    throw new Error(exceptionDetails.exception?.description ?? expression);
  }
  return result.value;
}

/** Resolves once `selector` matches, or fails after `timeout` ms. */
const waitFor = (cdp, selector, timeout = 10000) =>
  evaluate(
    cdp,
    `new Promise((resolve, reject) => {
      const started = Date.now();
      const check = () => {
        if (document.querySelector(${JSON.stringify(selector)})) resolve(true);
        else if (Date.now() - started > ${timeout}) reject(new Error('Timed out waiting for ${selector.replaceAll("'", "\\'")}'));
        else setTimeout(check, 100);
      };
      check();
    })`
  );

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
const { chrome, profile, wsUrl } = await launchChrome();
let failed = false;
try {
  const cdp = await connect(wsUrl);
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
  const exited = new Promise(resolve => {
    chrome.once('exit', resolve);
  });
  chrome.kill();
  await exited;
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
}
const sorted = Object.fromEntries(
  Object.entries(manifest).toSorted(([a], [b]) => a.localeCompare(b))
);
fs.writeFileSync(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`);
process.exit(failed ? 1 : 0);

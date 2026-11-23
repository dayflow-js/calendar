#!/usr/bin/env node
/**
 * Captures the README's mobile screenshots: two demo views per image, each
 * inside a phone frame.
 *
 *   npm run dev                       # in another terminal
 *   npm run readme:capture-mobile
 *
 * Options: --base <url> (default http://localhost:3000), --chrome <path>.
 * Images go to ../assets/images (Mobile-Day-Year.png, Mobile-Week-Month.png).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
const outDir = path.resolve(root, '../assets/images');

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args.splice(index, 2)[1];
};
const base = option('base', 'http://localhost:3000');
const chromePath = option('chrome', defaultChromePath);

const images = [
  { file: 'Mobile-Day-Year.png', views: ['year', 'day'] },
  { file: 'Mobile-Week-Month.png', views: ['week', 'month'] },
];

/** iPhone 15-class screen, in CSS pixels. */
const SCREEN = { width: 390, height: 844 };
const STATUS_BAR = 54;
const SCALE = 3;

/** Fills the viewport with the calendar alone: no site chrome, no card. */
const FULLSCREEN_CSS = `
  nextjs-portal { display: none !important; }
  *, *::before, *::after { caret-color: transparent !important; }
  .calendar-wrapper {
    position: fixed !important; inset: 0 !important; z-index: 2147483647;
    min-height: 0 !important; background: #fff;
  }
  .calendar-wrapper .df-calendar-wrapper,
  .calendar-wrapper .df-calendar-container {
    height: 100% !important; max-height: none !important;
    border: 0 !important; border-radius: 0 !important; box-shadow: none !important;
  }
`;

async function captureView(cdp, view) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: SCREEN.width,
    height: SCREEN.height - STATUS_BAR,
    deviceScaleFactor: SCALE,
    mobile: true,
  });
  const { identifier } = await cdp.send(
    'Page.addScriptToEvaluateOnNewDocument',
    {
      source: `localStorage.setItem('theme', 'light');
        addEventListener('DOMContentLoaded', () => {
          const style = document.createElement('style');
          style.textContent = ${JSON.stringify(FULLSCREEN_CSS)};
          document.head.append(style);
        });`,
    }
  );
  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', {
    url: new URL(`/demo?view=${view}&controls=0`, base).href,
  });
  await loaded;
  await waitFor(cdp, '.df-calendar-container');
  await sleep(1500);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  return `data:image/png;base64,${data}`;
}

const time = new Date().toLocaleTimeString('en-GB', {
  hour: 'numeric',
  minute: '2-digit',
});

const statusIcons = `
  <svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
  <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 2.4c2.3 0 4.4.9 6 2.4l1.2-1.2A10.2 10.2 0 0 0 8 .7 10.2 10.2 0 0 0 .8 3.6L2 4.8a8.5 8.5 0 0 1 6-2.4Z"/><path d="M8 5.8c1.4 0 2.6.5 3.6 1.4l1.2-1.2A6.8 6.8 0 0 0 8 4.1 6.8 6.8 0 0 0 3.2 6l1.2 1.2c1-.9 2.2-1.4 3.6-1.4Z"/><path d="M8 9.2c.5 0 .9.2 1.2.5L8 11 6.8 9.7c.3-.3.7-.5 1.2-.5Z"/></svg>
  <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.5"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" opacity=".45"/></svg>`;

const phone = src => `
  <div class="phone">
    <span class="btn action"></span><span class="btn vol-up"></span><span class="btn vol-down"></span><span class="btn power"></span>
    <div class="screen">
      <div class="status"><span class="time">${time}</span><span class="island"></span><span class="icons">${statusIcons}</span></div>
      <img src="${src}" alt="" />
      <span class="home"></span>
    </div>
  </div>`;

const page = shots => `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 1920px; height: 1280px; overflow: hidden; }
  body {
    display: flex; align-items: center; justify-content: center; gap: 150px;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
    background:
      radial-gradient(ellipse 60% 70% at 15% 10%, #8fd3ff 0%, transparent 60%),
      radial-gradient(ellipse 55% 65% at 90% 95%, #c4b5fd 0%, transparent 60%),
      radial-gradient(ellipse 50% 50% at 75% 15%, #a5f3d0 0%, transparent 55%),
      linear-gradient(135deg, #4f6ef7 0%, #6d4fe0 55%, #3b2a9e 100%);
  }
  .phone {
    position: relative; zoom: 1.32;
    width: ${SCREEN.width + 28}px; height: ${SCREEN.height + 28}px;
    padding: 14px; border-radius: 68px;
    background: linear-gradient(145deg, #3a3a3e, #1b1b1d 40%, #2c2c30);
    box-shadow:
      inset 0 0 0 1.5px #5a5a60, inset 0 0 0 5px #111,
      0 50px 90px -20px rgba(15, 10, 60, .55), 0 18px 36px rgba(15, 10, 60, .3);
  }
  .btn { position: absolute; width: 4px; border-radius: 2px; background: #2a2a2e; }
  .action { left: -3px; top: 150px; height: 32px; }
  .vol-up { left: -3px; top: 210px; height: 62px; }
  .vol-down { left: -3px; top: 286px; height: 62px; }
  .power { right: -3px; top: 240px; height: 100px; }
  .screen {
    position: relative; width: 100%; height: 100%;
    border-radius: 54px; overflow: hidden; background: #fff;
  }
  .status {
    position: relative; height: ${STATUS_BAR}px;
    display: flex; align-items: center; justify-content: space-between;
    padding: 4px 30px 0 46px; color: #000;
  }
  .time { font-size: 17px; font-weight: 600; letter-spacing: -.2px; }
  .icons { display: flex; align-items: center; gap: 6px; fill: currentColor; }
  .island {
    position: absolute; left: 50%; top: 11px; transform: translateX(-50%);
    width: 124px; height: 36px; border-radius: 20px; background: #000;
  }
  .screen img { display: block; width: ${SCREEN.width}px; height: ${SCREEN.height - STATUS_BAR}px; }
  .home {
    position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%);
    width: 136px; height: 5px; border-radius: 3px; background: #111;
  }
</style></head><body>${shots.map(phone).join('')}</body></html>`;

const browser = await launchChrome(chromePath);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dayflow-readme-'));
try {
  const cdp = await connect(browser.wsUrl);
  await cdp.send('Page.enable');
  for (const image of images) {
    const shots = [];
    for (const view of image.views) shots.push(await captureView(cdp, view));

    const html = path.join(tmp, 'frame.html');
    fs.writeFileSync(html, page(shots));
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1280,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const loaded = cdp.once('Page.loadEventFired');
    await cdp.send('Page.navigate', { url: pathToFileURL(html).href });
    await loaded;
    await evaluate(cdp, 'document.fonts.ready.then(() => true)');
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png',
    });
    fs.writeFileSync(
      path.join(outDir, image.file),
      Buffer.from(data, 'base64')
    );
    console.log(`✓ ${image.file}  (${image.views.join(' + ')})`);
  }
  cdp.close();
} finally {
  await closeChrome(browser);
  fs.rmSync(tmp, { recursive: true, force: true });
}

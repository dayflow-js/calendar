/**
 * Headless Chrome over the DevTools protocol, shared by the capture scripts
 * so they need no extra dependencies.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const defaultChromePath =
  process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : 'google-chrome';

export const sleep = ms =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

export async function launchChrome(chromePath = defaultChromePath) {
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

export function connect(wsUrl) {
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

export async function evaluate(cdp, expression) {
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
export const waitFor = (cdp, selector, timeout = 10000) =>
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

/** Kills Chrome and removes its throwaway profile. */
export async function closeChrome({ chrome, profile }) {
  const exited = new Promise(resolve => {
    chrome.once('exit', resolve);
  });
  chrome.kill();
  await exited;
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
}

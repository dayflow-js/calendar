/**
 * Minimal CalDAV backend proxy — Node.js (no framework required)
 *
 * Responsibilities:
 * - Accept CalDAV requests from the browser as { url, init } JSON payloads
 * - Add server-side credentials before forwarding to the CalDAV server
 * - Return the upstream response (status + headers + body)
 * - Add CORS headers so the browser can make cross-origin requests
 *
 * Credentials never leave this process. @dayflow/caldav in the browser
 * only talks to /api/caldav on this server.
 *
 * Required environment variables:
 *   CALDAV_BASE_URL   CalDAV server root, e.g. https://nextcloud.example.com/remote.php/dav
 *   CALDAV_USERNAME   CalDAV username
 *   CALDAV_PASSWORD   CalDAV password or app token
 *
 * Optional:
 *   FRONTEND_ORIGIN   Allowed browser origin, e.g. http://localhost:5173 (default: *)
 *   PORT              Port to listen on (default: 3001)
 *
 * node --env-file=.env.local examples/sync-connectivity/proxy.mjs
 */

import { createServer } from 'node:http';

const {
  CALDAV_BASE_URL,
  CALDAV_USERNAME,
  CALDAV_PASSWORD,
  FRONTEND_ORIGIN = '*',
  PORT = '3001',
} = process.env;

if (!CALDAV_BASE_URL || !CALDAV_USERNAME || !CALDAV_PASSWORD) {
  console.error(
    'Missing required environment variables: CALDAV_BASE_URL, CALDAV_USERNAME, CALDAV_PASSWORD'
  );
  process.exit(1);
}

const BASIC_AUTH = `Basic ${Buffer.from(`${CALDAV_USERNAME}:${CALDAV_PASSWORD}`).toString('base64')}`;
const MAX_BODY_BYTES = 1024 * 1024;
const ALLOWED_METHODS = new Set(['PROPFIND', 'REPORT', 'PUT', 'DELETE']);

// Headers that CalDAV clients send and the upstream server expects
const FORWARDED_REQUEST_HEADERS = [
  'content-type',
  'depth',
  'if-match',
  'if-none-match',
];

// Headers that the CalDAV server returns that the client needs
const FORWARDED_RESPONSE_HEADERS = ['content-type', 'etag', 'location', 'dav'];

function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Depth, If-Match, If-None-Match'
  );
  res.setHeader('Access-Control-Expose-Headers', 'ETag, Location, DAV');
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error('Request body too large');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function normalizeHeaders(headers = {}) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}

function buildUpstreamUrl(path) {
  if (!path.startsWith('/')) {
    throw new Error('CalDAV URL must be an absolute path');
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//')) {
    throw new Error('Absolute upstream URLs are not allowed');
  }

  const base = new URL(
    CALDAV_BASE_URL.endsWith('/') ? CALDAV_BASE_URL : `${CALDAV_BASE_URL}/`
  );
  const target = new URL(`.${path}`, base);
  if (!target.pathname.startsWith(base.pathname)) {
    throw new Error('CalDAV URL escapes the configured base path');
  }

  return target.toString();
}

async function handleCalDAVProxy(req, res) {
  let payload;
  try {
    const body = await readBody(req);
    payload = JSON.parse(body);
  } catch {
    res.writeHead(400);
    res.end('Invalid JSON payload');
    return;
  }

  const { url, init = {} } = payload;
  const method = String(init.method ?? '').toUpperCase();

  if (!url || typeof url !== 'string') {
    res.writeHead(400);
    res.end('Missing url in payload');
    return;
  }
  if (!ALLOWED_METHODS.has(method)) {
    res.writeHead(405);
    res.end('Unsupported CalDAV method');
    return;
  }

  let upstreamUrl;
  try {
    upstreamUrl = buildUpstreamUrl(url);
  } catch (err) {
    res.writeHead(400);
    res.end(err instanceof Error ? err.message : 'Invalid CalDAV URL');
    return;
  }

  // Build request headers: forward safe headers, inject auth, drop anything dangerous
  const inputHeaders = normalizeHeaders(init.headers);
  const upstreamHeaders = { Authorization: BASIC_AUTH };
  for (const header of FORWARDED_REQUEST_HEADERS) {
    const value = inputHeaders[header];
    if (value) upstreamHeaders[header] = value;
  }

  let upstream;
  try {
    upstream = await fetch(upstreamUrl, {
      method,
      headers: upstreamHeaders,
      body: init.body ?? undefined,
    });
  } catch (err) {
    console.error('Upstream request failed:', err);
    res.writeHead(502);
    res.end('Bad Gateway');
    return;
  }

  // Build response headers
  const responseHeaders = {};
  for (const header of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(header);
    if (value) responseHeaders[header] = value;
  }

  res.writeHead(upstream.status, responseHeaders);
  const responseBody = await upstream.arrayBuffer();
  res.end(Buffer.from(responseBody));
}

const server = createServer(async (req, res) => {
  setCORSHeaders(res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Only accept POST /api/caldav
  if (req.method === 'POST' && req.url === '/api/caldav') {
    await handleCalDAVProxy(req, res);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(Number.parseInt(PORT, 10), () => {
  console.log(`CalDAV proxy listening on http://localhost:${PORT}/api/caldav`);
  console.log(`Proxying to: ${CALDAV_BASE_URL}`);
  console.log(`CORS origin: ${FRONTEND_ORIGIN}`);
});

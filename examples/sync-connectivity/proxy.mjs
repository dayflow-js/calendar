/**
 * Google + iCloud connectivity proxy for the DayFlow sync examples.
 *
 * Credentials stay in this Node process. The browser only talks to localhost.
 *
 * Google env, choose one:
 *   GOOGLE_ACCESS_TOKEN
 *
 * Or refresh-token flow:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REFRESH_TOKEN
 *
 * iCloud env:
 *   ICLOUD_USERNAME
 *   ICLOUD_APP_PASSWORD
 *
 * Optional:
 *   ICLOUD_CALDAV_BASE_URL=https://caldav.icloud.com
 *   FRONTEND_ORIGIN=http://localhost:5529
 *   PORT=3002
 */

import { createServer } from 'node:http';

const {
  FRONTEND_ORIGIN = '*',
  GOOGLE_ACCESS_TOKEN,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN,
  ICLOUD_USERNAME,
  ICLOUD_APP_PASSWORD,
  ICLOUD_PASSWORD,
  ICLOUD_CALDAV_BASE_URL = 'https://caldav.icloud.com',
  PORT = '3002',
} = process.env;

const GOOGLE_API_BASE = 'https://www.googleapis.com/calendar/v3';
const MAX_BODY_BYTES = 1024 * 1024;
const ICLOUD_ALLOWED_METHODS = new Set(['PROPFIND', 'REPORT', 'PUT', 'DELETE']);
const GOOGLE_ALLOWED_METHODS = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);
const icloudPassword = ICLOUD_APP_PASSWORD || ICLOUD_PASSWORD;
let cachedGoogleToken = GOOGLE_ACCESS_TOKEN
  ? { token: GOOGLE_ACCESS_TOKEN, expiresAt: Number.POSITIVE_INFINITY }
  : null;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );
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
    if (size > MAX_BODY_BYTES) throw new Error('Request body too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function normalizeHeaders(headers = {}) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}

async function getGoogleAccessToken() {
  if (cachedGoogleToken && cachedGoogleToken.expiresAt > Date.now() + 30_000) {
    return cachedGoogleToken.token;
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error(
      'Configure GOOGLE_ACCESS_TOKEN or GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REFRESH_TOKEN'
    );
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Google token refresh failed: ${response.status} ${await response.text()}`
    );
  }

  const data = await response.json();
  cachedGoogleToken = {
    token: data.access_token,
    expiresAt:
      Date.now() + Math.max(1, Number(data.expires_in ?? 3600) - 60) * 1000,
  };
  return cachedGoogleToken.token;
}

async function handleGoogle(req, res) {
  const method = req.method?.toUpperCase() ?? '';
  if (!GOOGLE_ALLOWED_METHODS.has(method)) {
    res.writeHead(405);
    res.end('Unsupported Google method');
    return;
  }

  let token;
  try {
    token = await getGoogleAccessToken();
  } catch (err) {
    json(res, 400, {
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  const incomingUrl = new URL(req.url ?? '/', 'http://localhost');
  const upstreamPath = incomingUrl.pathname.replace(
    /^\/api\/google-calendar/,
    ''
  );
  const upstream = `${GOOGLE_API_BASE}${upstreamPath}${incomingUrl.search}`;
  const body =
    method === 'GET' || method === 'DELETE' ? undefined : await readBody(req);

  const response = await fetch(upstream, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': req.headers['content-type'] ?? 'application/json',
      ...(req.headers['if-match']
        ? { 'If-Match': String(req.headers['if-match']) }
        : {}),
    },
    body,
  });

  const headers = {
    'Content-Type': response.headers.get('content-type') ?? 'application/json',
  };
  const etag = response.headers.get('etag');
  if (etag) headers.ETag = etag;

  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}

function getICloudAuthHeader() {
  if (!ICLOUD_USERNAME || !icloudPassword) {
    throw new Error('Configure ICLOUD_USERNAME and ICLOUD_APP_PASSWORD');
  }
  return `Basic ${Buffer.from(`${ICLOUD_USERNAME}:${icloudPassword}`).toString('base64')}`;
}

function buildICloudUrl(input) {
  const base = new URL(
    ICLOUD_CALDAV_BASE_URL.endsWith('/')
      ? ICLOUD_CALDAV_BASE_URL
      : `${ICLOUD_CALDAV_BASE_URL}/`
  );
  const target = /^https?:\/\//i.test(input)
    ? new URL(input)
    : new URL(input.startsWith('/') ? input : `/${input}`, base);

  if (target.origin !== base.origin) {
    throw new Error('iCloud proxy only allows the configured CalDAV origin');
  }
  return target.toString();
}

function icloudFetch(url, init = {}) {
  return fetch(buildICloudUrl(url), {
    ...init,
    headers: {
      ...init.headers,
      Authorization: getICloudAuthHeader(),
    },
  });
}

function parseFirstHref(xml, tagName) {
  const normalized = xml
    .replaceAll(/<\?[\s\S]*?\?>/g, '')
    .replaceAll(/\s+xmlns(?::\w+)?="[^"]*"/g, '')
    .replaceAll(/<(\/?)(\w+):([\w-]+)/g, '<$1$3');
  const block = normalized.match(
    new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i')
  )?.[1];
  return block?.match(/<href[^>]*>([^<]+)<\/href>/i)?.[1]?.trim();
}

async function discoverICloudHome() {
  const principalBody = `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:"><D:prop><D:current-user-principal/></D:prop></D:propfind>`;
  const homeBody = `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav"><D:prop><C:calendar-home-set/></D:prop></D:propfind>`;

  const principalResponse = await icloudFetch(ICLOUD_CALDAV_BASE_URL, {
    method: 'PROPFIND',
    headers: { 'Content-Type': 'application/xml; charset=utf-8', Depth: '0' },
    body: principalBody,
  });
  if (!principalResponse.ok && principalResponse.status !== 207) {
    throw new Error(
      `current-user-principal failed: ${principalResponse.status}`
    );
  }

  const principalHref = parseFirstHref(
    await principalResponse.text(),
    'current-user-principal'
  );
  if (!principalHref) throw new Error('current-user-principal href not found');

  const principalUrl = buildICloudUrl(principalHref);
  const homeResponse = await icloudFetch(principalUrl, {
    method: 'PROPFIND',
    headers: { 'Content-Type': 'application/xml; charset=utf-8', Depth: '0' },
    body: homeBody,
  });
  if (!homeResponse.ok && homeResponse.status !== 207) {
    throw new Error(`calendar-home-set failed: ${homeResponse.status}`);
  }

  const homeHref = parseFirstHref(
    await homeResponse.text(),
    'calendar-home-set'
  );
  if (!homeHref) throw new Error('calendar-home-set href not found');
  return buildICloudUrl(homeHref);
}

async function handleICloudDiscover(_req, res) {
  try {
    json(res, 200, { calendarHomeUrl: await discoverICloudHome() });
  } catch (err) {
    json(res, 400, { error: err instanceof Error ? err.message : String(err) });
  }
}

async function handleICloudProxy(req, res) {
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
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
  if (!ICLOUD_ALLOWED_METHODS.has(method)) {
    res.writeHead(405);
    res.end('Unsupported iCloud CalDAV method');
    return;
  }

  const inputHeaders = normalizeHeaders(init.headers);
  const headers = {
    'Content-Type':
      inputHeaders['content-type'] ?? 'application/xml; charset=utf-8',
    ...(inputHeaders.depth ? { Depth: inputHeaders.depth } : {}),
    ...(inputHeaders['if-match']
      ? { 'If-Match': inputHeaders['if-match'] }
      : {}),
    ...(inputHeaders['if-none-match']
      ? { 'If-None-Match': inputHeaders['if-none-match'] }
      : {}),
  };

  let response;
  try {
    response = await icloudFetch(url, {
      method,
      headers,
      body: init.body ?? undefined,
    });
  } catch (err) {
    json(res, 502, { error: err instanceof Error ? err.message : String(err) });
    return;
  }

  const responseHeaders = {};
  for (const header of ['content-type', 'etag', 'location', 'dav']) {
    const value = response.headers.get(header);
    if (value) responseHeaders[header] = value;
  }
  res.writeHead(response.status, responseHeaders);
  res.end(Buffer.from(await response.arrayBuffer()));
}

function handleConfig(_req, res) {
  json(res, 200, {
    google: Boolean(
      GOOGLE_ACCESS_TOKEN ||
      (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN)
    ),
    icloud: Boolean(ICLOUD_USERNAME && icloudPassword),
  });
}

const server = createServer(async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url ?? '/';
  if (req.method === 'GET' && url === '/api/sync-connectivity/config') {
    handleConfig(req, res);
    return;
  }
  if (req.method === 'GET' && url === '/api/icloud/discover') {
    await handleICloudDiscover(req, res);
    return;
  }
  if (req.method === 'POST' && url === '/api/icloud-caldav') {
    await handleICloudProxy(req, res);
    return;
  }
  if (url.startsWith('/api/google-calendar/')) {
    await handleGoogle(req, res);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(Number(PORT), () => {
  console.log(`Sync connectivity proxy listening on http://localhost:${PORT}`);
  console.log(`Allowed frontend origin: ${FRONTEND_ORIGIN}`);
});

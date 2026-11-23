const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const BASE_PATH =
  rawBasePath.length > 1 && rawBasePath.endsWith('/')
    ? rawBasePath.slice(0, -1)
    : rawBasePath;

const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (BASE_PATH
    ? `https://dayflow-js.github.io${BASE_PATH}`
    : 'http://localhost:3000');

export const SITE_URL = rawSiteUrl.endsWith('/')
  ? rawSiteUrl.slice(0, -1)
  : rawSiteUrl;

export const SITE_METADATA_BASE = new URL(SITE_URL);

/**
 * Cross-site links to the rest of the suite, without UTM parameters.
 *
 * These used to carry `?utm_source=calendar.dayflow.studio&...`. To Google a
 * `?utm_*` URL is a separate URL, so the link was credited to the parameterised
 * address rather than to the canonical one, and Search Console reported no
 * referring pages at all for `pro.dayflow.studio/` and
 * `scheduler.dayflow.studio/` -- the only inbound links either site has.
 *
 * GA4 already attributes these clicks by referrer, so the parameters added no
 * data we did not have.
 */
export const PRO_URL = 'https://pro.dayflow.studio';
export const SCHEDULER_URL = 'https://scheduler.dayflow.studio';
export const BRAND_URL = 'https://dayflow.studio';

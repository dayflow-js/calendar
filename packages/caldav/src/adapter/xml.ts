/**
 * Minimal XML utilities for CalDAV multistatus response parsing.
 *
 * CalDAV responses follow predictable patterns (multistatus → response → propstat → prop).
 * Rather than a full XML parser, we normalize namespace prefixes and use targeted
 * regex extraction — sufficient for well-formed CalDAV XML and avoids a DOM dependency.
 */

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Strip namespace prefixes and declarations so element names can be matched
 * without knowing which prefix a server chose.
 *
 * Examples after normalization:
 *   <D:displayname> → <displayname>
 *   <C:calendar-data> → <calendar-data>
 *   <IC:calendar-color> → <calendar-color>  (Apple ns/ical/)
 *   <CS:calendar-color> → <calendar-color>  (calendarserver.org)
 */
export function normalizeXml(xml: string): string {
  return xml
    .replaceAll(/<\?[\s\S]*?\?>/g, '') // remove processing instructions
    .replaceAll(/\s+xmlns(?::\w+)?="[^"]*"/g, '') // remove xmlns attribute declarations
    .replaceAll(/<(\/?)(\w+):([\w-]+)/g, '<$1$3'); // strip "prefix:" from element names
}

// ─── Extraction helpers ───────────────────────────────────────────────────────

function decodeXmlText(value: string): string {
  return value
    .replaceAll(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replaceAll(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(Number.parseInt(dec, 10))
    )
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}

/** Text content of the first matching element (case-insensitive). */
export function getFirstText(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? decodeXmlText(m[1].trim()) : null;
}

/** Split a normalized multistatus body into individual `<response>` blocks. */
export function getResponseBlocks(xml: string): string[] {
  const normalized = normalizeXml(xml);
  const blocks: string[] = [];
  const re = /<response(?:\s[^>]*)?>([\s\S]*?)<\/response>/gi;
  let m;
  while ((m = re.exec(normalized)) !== null) {
    blocks.push(m[1]);
  }
  return blocks;
}

// ─── CalDAV-specific extractors ───────────────────────────────────────────────

/**
 * Extract `calendar-data` from a response block.
 * Handles both CDATA-wrapped and plain XML-entity-encoded content.
 */
export function getCalendarData(block: string): string {
  const cdata = block.match(
    /<calendar-data[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/calendar-data>/i
  );
  if (cdata) return cdata[1];

  const plain = block.match(/<calendar-data[^>]*>([\s\S]*?)<\/calendar-data>/i);
  if (plain) {
    return decodeXmlText(plain[1]).trim();
  }
  return '';
}

/**
 * True when the response block describes a CalDAV calendar collection.
 * Skips the principal/home collection itself (no `<calendar>` in resourcetype).
 */
export function isCalendarCollection(block: string): boolean {
  const rt = getFirstText(block, 'resourcetype');
  if (!rt) return false;
  return /<calendar(?:[\s/>]|>)/i.test(rt);
}

/**
 * Extract a hex calendar color from a response block.
 * Checks both Apple (`http://apple.com/ns/ical/`) and CalendarServer
 * (`http://calendarserver.org/ns/`) extensions — both normalize to `calendar-color`.
 *
 * Nextcloud sends 8-digit RGBA (#RRGGBBAA); the alpha channel is stripped.
 */
export function getCalendarColor(block: string): string | undefined {
  const raw = getFirstText(block, 'calendar-color');
  if (!raw) return undefined;
  const hex = raw.trim().split(/\s/)[0];
  if (/^#[0-9a-fA-F]{8}$/.test(hex)) return hex.slice(0, 7); // strip alpha
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) return hex;
  return undefined;
}

/**
 * Extract write permissions from `current-user-privilege-set`.
 *
 * CalDAV privilege model:
 *   bind   → can create new resources (PUT If-None-Match: *)
 *   unbind → can delete resources
 *   write / write-content → can update existing resources
 *
 * Radicale may omit `current-user-privilege-set`; returns all undefined when absent.
 */
export function getPrivileges(block: string): {
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
} {
  const ps = getFirstText(block, 'current-user-privilege-set');
  if (!ps) return {};

  const has = (name: string): boolean =>
    new RegExp(`<${name}(?:[\\s/>]|>)`).test(ps);

  const write = has('write') || has('write-content');
  const bind = has('bind') || write;
  const unbind = has('unbind') || write;

  return {
    canCreate: bind || undefined,
    canUpdate: write || undefined,
    canDelete: unbind || undefined,
  };
}

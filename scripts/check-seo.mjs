import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PERMANENT_REDIRECTS as EXPECTED_REDIRECTS } from '../worker/index.js';

const SCRIPT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_ROOT = process.env.SEO_CHECK_ROOT
  ? resolve(process.env.SEO_CHECK_ROOT)
  : SCRIPT_ROOT;
const DIST_ROOT = join(PROJECT_ROOT, 'dist');
const CLIENT_ROOT = join(DIST_ROOT, 'client');
const ORIGIN = 'https://seattleinfinity.org';
const SITEMAP_URL = `${ORIGIN}/sitemap.xml`;
const EXPECTED_INDEXABLE_PAGE_COUNT = 78;

const STATIC_PATHS = [
  '/',
  '/events',
  '/resources',
  '/past-tests',
  '/press-releases',
  '/about-us',
  '/contact',
  '/newsletters',
  '/calendar',
  '/potm',
];

const KNOWN_ALIASES = new Set([...EXPECTED_REDIRECTS.keys()]);
const CONTENT_ROUTE_FAMILIES = [
  { directory: join(PROJECT_ROOT, 'src', 'events'), prefix: '/events/' },
  { directory: join(PROJECT_ROOT, 'src', 'press-releases'), prefix: '/press-releases/' },
  { directory: join(PROJECT_ROOT, 'src', 'past-tests'), prefix: '/past-tests/' },
];

const errors = [];
const counts = {
  sitemapUrls: 0,
  htmlPages: 0,
  notFoundPages: 0,
  jsonLdScripts: 0,
  feedEntries: 0,
  feedUrls: 0,
};

const outputRelative = (pathname) => {
  const value = relative(CLIENT_ROOT, pathname);
  return value.split('\\').join('/');
};

const outputLabel = (pathname) => `dist/client/${pathname}`;
const sitemapLabel = outputLabel('sitemap.xml');

function addError(scope, message) {
  errors.push(`${scope}: ${message}`);
}

const slugifyRouteSegment = (value) => String(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/gu, '-')
  .replace(/^-|-$/gu, '');

function frontMatterValue(source, key) {
  if (!source.startsWith('---')) return '';
  const end = source.indexOf('\n---', 3);
  if (end < 0) return '';
  const match = new RegExp(`^${key}:\\s*(.*)$`, 'mu').exec(source.slice(4, end));
  return match?.[1]?.trim() || '';
}

function splitFrontMatterList(value) {
  return value.split(/\s*;\s*/u).filter(Boolean);
}

function readText(pathname, scope) {
  try {
    return readFileSync(pathname, 'utf8');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    addError(scope, `unable to read ${pathname}: ${detail}`);
    return null;
  }
}

function isFile(pathname) {
  try {
    return statSync(pathname).isFile();
  } catch {
    return false;
  }
}

function findTagEnd(source, start) {
  let quote = null;
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index;
    }
  }
  return -1;
}

function decodeEntities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (whole, entity) => {
    const lower = entity.toLowerCase();
    if (lower === 'amp') return '&';
    if (lower === 'lt') return '<';
    if (lower === 'gt') return '>';
    if (lower === 'quot') return '"';
    if (lower === 'apos') return "'";
    if (lower === 'nbsp') return ' ';
    const number = lower.startsWith('#x')
      ? Number.parseInt(lower.slice(2), 16)
      : Number.parseInt(lower.slice(1), 10);
    if (!Number.isFinite(number) || number < 0 || number > 0x10ffff) return whole;
    try {
      return String.fromCodePoint(number);
    } catch {
      return whole;
    }
  });
}

function parseAttributes(source) {
  const attributes = [];
  let index = 0;

  while (index < source.length) {
    while (index < source.length && /\s/.test(source[index])) index += 1;
    while (index < source.length && source[index] === '/') index += 1;
    while (index < source.length && /\s/.test(source[index])) index += 1;
    if (index >= source.length) break;

    const nameStart = index;
    while (index < source.length && !/[\s=/>]/.test(source[index])) index += 1;
    if (nameStart === index) {
      index += 1;
      continue;
    }

    const name = source.slice(nameStart, index).toLowerCase();
    while (index < source.length && /\s/.test(source[index])) index += 1;

    let value = '';
    if (source[index] === '=') {
      index += 1;
      while (index < source.length && /\s/.test(source[index])) index += 1;
      if (source[index] === '"' || source[index] === "'") {
        const quote = source[index];
        index += 1;
        const valueStart = index;
        while (index < source.length && source[index] !== quote) index += 1;
        value = source.slice(valueStart, index);
        if (index < source.length) index += 1;
      } else {
        const valueStart = index;
        while (index < source.length && !/[\s>]/.test(source[index])) index += 1;
        value = source.slice(valueStart, index).replace(/\/$/, '');
      }
    }

    attributes.push({ name, value: decodeEntities(value) });
  }

  return attributes;
}

function firstAttribute(attributes, name) {
  return attributes.find((attribute) => attribute.name === name)?.value;
}

function allAttributes(attributes, name) {
  return attributes.filter((attribute) => attribute.name === name).map((attribute) => attribute.value);
}

function findClosingTag(source, name, start) {
  const lowerSource = source.toLowerCase();
  const lowerName = name.toLowerCase();
  let cursor = start;
  while (cursor < source.length) {
    const candidate = lowerSource.indexOf(`</${lowerName}`, cursor);
    if (candidate < 0) return null;
    const afterName = source[candidate + lowerName.length + 2] || '';
    if (afterName === '>' || /\s/.test(afterName)) {
      const end = findTagEnd(source, candidate);
      if (end < 0) return { start: candidate, end: -1 };
      return { start: candidate, end };
    }
    cursor = candidate + 2;
  }
  return null;
}

function parseOpenTag(raw) {
  const match = /^<\s*([A-Za-z][\w:.-]*)\b([\s\S]*?)>\s*$/u.exec(raw);
  if (!match) return null;
  const attributesSource = match[2].replace(/\/\s*$/u, '');
  return {
    name: match[1].toLowerCase(),
    attributes: parseAttributes(attributesSource),
    selfClosing: /\/\s*>$/u.test(raw),
  };
}

function scanHtml(source) {
  const tokens = [];
  const issues = [];
  let cursor = 0;

  while (cursor < source.length) {
    const start = source.indexOf('<', cursor);
    if (start < 0) break;

    if (source.startsWith('<!--', start)) {
      const endComment = source.indexOf('-->', start + 4);
      if (endComment < 0) issues.push('unterminated HTML comment');
      cursor = endComment < 0 ? source.length : endComment + 3;
      continue;
    }

    const end = findTagEnd(source, start);
    if (end < 0) {
      issues.push(`unterminated HTML tag near byte ${start}`);
      break;
    }

    const raw = source.slice(start, end + 1);
    const closeMatch = /^<\s*\/\s*([A-Za-z][\w:.-]*)/u.exec(raw);
    if (closeMatch) {
      tokens.push({
        kind: 'close',
        name: closeMatch[1].toLowerCase(),
        start,
        end,
      });
      cursor = end + 1;
      continue;
    }

    if (/^<\s*[!?]/u.test(raw)) {
      cursor = end + 1;
      continue;
    }

    const parsed = parseOpenTag(raw);
    if (!parsed) {
      cursor = end + 1;
      continue;
    }

    const token = {
      kind: 'open',
      ...parsed,
      start,
      end,
      contentStart: parsed.selfClosing ? null : end + 1,
      contentEnd: null,
      closeStart: null,
      closeEnd: null,
    };
    tokens.push(token);

    if (parsed.name === 'script' && !parsed.selfClosing) {
      const closing = findClosingTag(source, parsed.name, end + 1);
      if (!closing || closing.end < 0) {
        issues.push('unterminated <script> element');
        cursor = end + 1;
        continue;
      }
      token.contentEnd = closing.start;
      token.closeStart = closing.start;
      token.closeEnd = closing.end;
      cursor = closing.end + 1;
      continue;
    }

    cursor = end + 1;
  }

  return { tokens, issues };
}

function matchingClose(tokens, openIndex) {
  const opening = tokens[openIndex];
  if (!opening || opening.kind !== 'open' || opening.selfClosing) return null;

  let depth = 1;
  for (let index = openIndex + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.name !== opening.name) continue;
    if (token.kind === 'open' && !token.selfClosing) depth += 1;
    if (token.kind === 'close') {
      depth -= 1;
      if (depth === 0) return token;
    }
  }
  return null;
}

function elementInnerHtml(source, tokens, openIndex) {
  const opening = tokens[openIndex];
  const closing = matchingClose(tokens, openIndex);
  if (!opening || !closing) return null;
  return source.slice(opening.end + 1, closing.start);
}

function normalizeText(value) {
  return decodeEntities(value.replace(/<[^>]*>/gu, ' ')).replace(/\s+/gu, ' ').trim();
}

function hasMeaningfulRootContent(inner) {
  const withoutComments = inner
    .replace(/<!--[\s\S]*?-->/gu, ' ')
    .replace(/<script\b[\s\S]*?<\/script\s*>/giu, ' ')
    .replace(/<style\b[\s\S]*?<\/style\s*>/giu, ' ');
  if (normalizeText(withoutComments)) return true;
  return /<(?:img|svg|canvas|iframe|form|table|video|audio)\b/iu.test(withoutComments);
}

function countLiteral(source, expression) {
  let count = 0;
  for (const _match of source.matchAll(expression)) count += 1;
  return count;
}

function metaValue(tokens, matcher, scope, label) {
  const matches = tokens.filter((token) => {
    if (token.kind !== 'open' || token.name !== 'meta') return false;
    const identities = [
      ...allAttributes(token.attributes, 'name'),
      ...allAttributes(token.attributes, 'property'),
    ];
    return identities.some((identity) => identity.toLowerCase() === matcher);
  });

  if (matches.length !== 1) {
    addError(scope, `${label} must appear exactly once (found ${matches.length})`);
    return null;
  }

  const value = firstAttribute(matches[0].attributes, 'content')?.trim() || '';
  if (!value) addError(scope, `${label} must have non-empty content`);
  return value || null;
}

function linkCanonicalValue(tokens, scope) {
  const matches = tokens.filter((token) => {
    if (token.kind !== 'open' || token.name !== 'link') return false;
    const rel = firstAttribute(token.attributes, 'rel') || '';
    return rel.split(/\s+/u).some((value) => value.toLowerCase() === 'canonical');
  });

  if (matches.length !== 1) {
    addError(scope, `canonical link must appear exactly once (found ${matches.length})`);
    return null;
  }

  const value = firstAttribute(matches[0].attributes, 'href')?.trim() || '';
  if (!value) addError(scope, 'canonical link must have a non-empty href');
  return value || null;
}

function validateJsonLd(html, tokens, scope, { required = true } = {}) {
  const scriptCount = tokens.filter((token) => token.kind === 'open' && token.name === 'script').length;
  const closeCount = countLiteral(html, /<\/script\b/giu);
  if (closeCount > scriptCount) {
    addError(scope, `found ${closeCount - scriptCount} unexpected literal </script> sequence(s); JSON-LD may be leaking an unescaped script terminator`);
  }

  const scripts = tokens.filter((token) => {
    if (token.kind !== 'open' || token.name !== 'script') return false;
    const type = firstAttribute(token.attributes, 'type') || '';
    return type.split(';', 1)[0].trim().toLowerCase() === 'application/ld+json';
  });

  if (scripts.length === 0) {
    if (required) addError(scope, 'at least one application/ld+json script is required');
    return;
  }

  for (let index = 0; index < scripts.length; index += 1) {
    const script = scripts[index];
    const scriptScope = `${scope} JSON-LD #${index + 1}`;
    if (script.contentEnd === null || script.closeEnd === null) {
      addError(scriptScope, 'script must have a closing </script> tag');
      continue;
    }

    const rawJson = html.slice(script.contentStart, script.contentEnd).trim();
    if (!rawJson) {
      addError(scriptScope, 'script content must be non-empty JSON');
      continue;
    }

    let value;
    try {
      value = JSON.parse(rawJson);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      addError(scriptScope, `content is not valid JSON (${detail}); escape any </script> inside JSON strings`);
      continue;
    }

    const contexts = [];
    const nodes = [];
    collectJsonLd(value, contexts, nodes);
    const usesSchema = contexts.some((context) => context === 'https://schema.org');
    if (!usesSchema) {
      addError(scriptScope, 'JSON-LD must declare the https://schema.org context');
    }

    const typedNode = nodes.find((node) => {
      const type = node['@type'];
      return (typeof type === 'string' && type.trim())
        || (Array.isArray(type) && type.some((entry) => typeof entry === 'string' && entry.trim()));
    });
    if (!typedNode) addError(scriptScope, 'JSON-LD must contain at least one typed schema.org object');
    counts.jsonLdScripts += 1;
  }
}

function collectJsonLd(value, contexts, nodes) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectJsonLd(entry, contexts, nodes));
    return;
  }
  if (!value || typeof value !== 'object') return;

  if (Object.prototype.hasOwnProperty.call(value, '@context')) {
    const context = value['@context'];
    if (typeof context === 'string') contexts.push(context);
    if (Array.isArray(context)) {
      context.forEach((entry) => {
        if (typeof entry === 'string') contexts.push(entry);
      });
    }
  }
  nodes.push(value);
  if (value['@graph'] !== undefined) collectJsonLd(value['@graph'], contexts, nodes);
}

function scanXml(source) {
  const tokens = [];
  const issues = [];
  const stack = [];
  let cursor = 0;

  while (cursor < source.length) {
    const start = source.indexOf('<', cursor);
    if (start < 0) break;

    if (source.startsWith('<!--', start)) {
      const endComment = source.indexOf('-->', start + 4);
      if (endComment < 0) issues.push(`unterminated XML comment near byte ${start}`);
      cursor = endComment < 0 ? source.length : endComment + 3;
      continue;
    }

    if (source.startsWith('<![CDATA[', start)) {
      const endCdata = source.indexOf(']]>', start + 9);
      if (endCdata < 0) issues.push(`unterminated CDATA section near byte ${start}`);
      cursor = endCdata < 0 ? source.length : endCdata + 3;
      continue;
    }

    if (source.startsWith('<?', start)) {
      const endInstruction = source.indexOf('?>', start + 2);
      if (endInstruction < 0) issues.push(`unterminated XML processing instruction near byte ${start}`);
      cursor = endInstruction < 0 ? source.length : endInstruction + 2;
      continue;
    }

    const end = findTagEnd(source, start);
    if (end < 0) {
      issues.push(`unterminated XML tag near byte ${start}`);
      break;
    }

    const raw = source.slice(start, end + 1);
    if (/^<\s*!/u.test(raw)) {
      cursor = end + 1;
      continue;
    }

    const closeMatch = /^<\s*\/\s*([A-Za-z][\w:.-]*)\s*>\s*$/u.exec(raw);
    if (closeMatch) {
      const name = closeMatch[1].toLowerCase();
      const opening = stack[stack.length - 1];
      if (!opening || opening.name !== name) {
        issues.push(`closing tag </${closeMatch[1]}> does not match the open element`);
      } else {
        opening.close = { start, end };
        stack.pop();
      }
      cursor = end + 1;
      continue;
    }

    const parsed = parseOpenTag(raw);
    if (!parsed) {
      issues.push(`malformed XML tag near byte ${start}`);
      cursor = end + 1;
      continue;
    }

    const token = {
      ...parsed,
      start,
      end,
      parent: stack[stack.length - 1] || null,
      close: null,
    };
    tokens.push(token);
    if (!parsed.selfClosing) stack.push(token);
    cursor = end + 1;
  }

  stack.forEach((token) => issues.push(`element <${token.name}> is not closed`));
  return { tokens, issues };
}

function xmlElementText(source, token) {
  if (!token.close) return '';
  let value = source.slice(token.end + 1, token.close.start);
  value = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gu, '$1');
  return decodeEntities(value).trim();
}

function localXmlName(name) {
  const pieces = name.toLowerCase().split(':');
  return pieces[pieces.length - 1];
}

function parseSitemap(source, sitemapPath) {
  if (!source.trim()) {
    addError(sitemapLabel, 'file is empty');
    return [];
  }

  const { tokens, issues } = scanXml(source);
  issues.forEach((issue) => addError(sitemapLabel, issue));

  const roots = tokens.filter((token) => !token.parent);
  if (roots.length !== 1) {
    addError(sitemapLabel, `expected exactly one XML root element (found ${roots.length})`);
    return [];
  }

  const root = roots[0];
  if (localXmlName(root.name) !== 'urlset') {
    addError(sitemapLabel, `root element must be <urlset> (found <${root.name}>)`);
    return [];
  }
  if (!root.close) addError(sitemapLabel, 'root <urlset> must have a closing tag');

  const namespace = firstAttribute(root.attributes, 'xmlns');
  if (namespace !== 'http://www.sitemaps.org/schemas/sitemap/0.9') {
    addError(sitemapLabel, 'root <urlset> must declare the sitemap 0.9 namespace');
  }

  if (root.start > 0) {
    const before = source.slice(0, root.start)
      .replace(/<\?[\s\S]*?\?>/gu, '')
      .replace(/<!--[\s\S]*?-->/gu, '')
      .trim();
    if (before) addError(sitemapLabel, 'non-whitespace content appears before the root element');
  }
  if (root.close) {
    const after = source.slice(root.close.end + 1)
      .replace(/<!--[\s\S]*?-->/gu, '')
      .trim();
    if (after) addError(sitemapLabel, 'non-whitespace content appears after the root element');
  }

  const urls = tokens.filter((token) => token.parent === root && localXmlName(token.name) === 'url');
  if (urls.length === 0) addError(sitemapLabel, 'sitemap must contain at least one <url> entry');

  const entries = [];
  const seenLocs = new Map();
  const seenPaths = new Map();

  urls.forEach((urlToken, index) => {
    const scope = `${sitemapLabel} url #${index + 1}`;
    if (!urlToken.close) {
      addError(scope, '<url> must have a closing tag');
      return;
    }

    const locs = tokens.filter((token) => token.parent === urlToken && localXmlName(token.name) === 'loc');
    if (locs.length !== 1) {
      addError(scope, `<url> must contain exactly one <loc> (found ${locs.length})`);
      return;
    }
    if (!locs[0].close) {
      addError(scope, '<loc> must have a closing tag');
      return;
    }

    const loc = xmlElementText(source, locs[0]);
    if (!loc) {
      addError(scope, '<loc> must be non-empty');
      return;
    }

    let parsed;
    try {
      parsed = new URL(loc);
    } catch {
      addError(scope, `<loc> is not a valid absolute URL: ${loc}`);
      return;
    }

    if (parsed.protocol !== 'https:') addError(scope, `URL must use https: ${loc}`);
    if (parsed.origin !== ORIGIN) addError(scope, `URL must use the canonical origin ${ORIGIN}: ${loc}`);
    if (parsed.search || parsed.hash) addError(scope, 'URL must not contain a query string or fragment');
    if (parsed.username || parsed.password || parsed.port) addError(scope, 'URL must not contain credentials or a port');

    let decodedPath;
    try {
      decodedPath = decodeURIComponent(parsed.pathname);
    } catch {
      addError(scope, `pathname contains malformed percent encoding: ${parsed.pathname}`);
      return;
    }
    if (decodedPath.includes('\\') || decodedPath.includes('\0') || decodedPath.split('/').some((part) => part === '..')) {
      addError(scope, `pathname is not a safe route path: ${parsed.pathname}`);
    }
    if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
      addError(scope, 'canonical route paths must not have a trailing slash');
    }
    if (/%2f|%5c/iu.test(parsed.pathname)) addError(scope, 'encoded slashes are not valid route paths');

    const path = parsed.pathname;
    if (KNOWN_ALIASES.has(path)) {
      addError(scope, `known route alias is not allowed in the sitemap: ${path}`);
    }

    const previousLoc = seenLocs.get(loc);
    if (previousLoc) addError(scope, `duplicate canonical URL (also listed at sitemap entry #${previousLoc})`);
    else seenLocs.set(loc, index + 1);
    const previousPath = seenPaths.get(path);
    if (previousPath) addError(scope, `duplicate canonical pathname (also listed at sitemap entry #${previousPath})`);
    else seenPaths.set(path, index + 1);

    entries.push({ loc, url: parsed, pathname: path, decodedPath });
  });

  counts.sitemapUrls = entries.length;
  return entries;
}

function listHtmlCandidates(directory, prefix = '') {
  if (!existsSync(directory)) return [];
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const result = [];
  entries.forEach((entry) => {
    // Framework Mode emits route data files alongside the HTML documents.
    // They are implementation details, not independently indexable pages.
    if (entry.name.toLowerCase().endsWith('.data')) return;

    const pathname = join(directory, entry.name);
    const relativeName = prefix ? join(prefix, entry.name) : entry.name;
    if (entry.isDirectory()) {
      result.push(...listHtmlCandidates(pathname, relativeName));
      return;
    }
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.html')) return;
    if (entry.name.toLowerCase() === '__spa-fallback.html') return;
    result.push({ path: pathname, relativeName });
  });
  return result;
}

function routePathFromHtml(relativeName) {
  const normalizedName = relativeName.split('\\').join('/');
  const parts = normalizedName.split('/');
  const file = parts.pop() || '';
  if (!file.toLowerCase().endsWith('.html')) return null;

  let routeParts = parts;
  if (file.toLowerCase() !== 'index.html') {
    routeParts = [...parts, file.slice(0, -'.html'.length)];
  }
  if (routeParts.length === 0) return '/';

  const rawPath = `/${routeParts.join('/')}`;
  if (rawPath.includes('\\') || rawPath.includes('\0') || rawPath.split('/').some((part) => part === '.' || part === '..')) {
    return null;
  }

  try {
    return decodeURIComponent(rawPath).replace(/\/+/gu, '/').replace(/\/$/u, '') || '/';
  } catch {
    // Keep malformed escapes visible so they cannot silently match a sitemap.
    return rawPath;
  }
}

function discoverHtmlOutputs() {
  const routeOutputs = new Map();
  const notFoundOutputs = [];
  const candidates = listHtmlCandidates(CLIENT_ROOT);

  candidates.forEach((candidate) => {
    const relativeName = outputRelative(candidate.path);
    if (relativeName === '404.html') {
      notFoundOutputs.push(candidate);
      return;
    }

    const pathname = routePathFromHtml(relativeName);
    if (!pathname) {
      addError(outputLabel(relativeName), 'HTML output path cannot be mapped to a safe route pathname');
      return;
    }
    // Framework prerendering may retain /404 as 404/index.html. The hosting
    // convention is the generated root 404.html, which is checked separately.
    if (pathname === '/404') return;

    const previous = routeOutputs.get(pathname);
    if (previous) {
      addError(outputLabel(relativeName), `multiple HTML outputs map to route ${pathname} (also ${outputLabel(outputRelative(previous.path))})`);
      return;
    }
    routeOutputs.set(pathname, candidate);
  });

  return { routeOutputs, notFoundOutputs };
}

function validateSpaFallback() {
  const pathname = join(CLIENT_ROOT, '__spa-fallback.html');
  if (!isFile(pathname)) return;

  const scope = outputLabel('__spa-fallback.html');
  const html = readText(pathname, scope);
  if (html === null) return;

  const { tokens, issues } = scanHtml(html);
  issues.forEach((issue) => addError(scope, issue));

  const canonicalLinks = tokens.filter((token) => {
    if (token.kind !== 'open' || token.name !== 'link') return false;
    const rel = firstAttribute(token.attributes, 'rel') || '';
    return rel.split(/\s+/u).some((value) => value.toLowerCase() === 'canonical');
  });
  if (canonicalLinks.length > 0) {
    addError(scope, 'generic SPA fallback must not contain a canonical link');
  }

  const routeSpecificMeta = new Set([
    'description',
    'og:title',
    'og:description',
    'og:url',
    'og:type',
    'twitter:title',
    'twitter:description',
    'twitter:card',
  ]);
  tokens.filter((token) => token.kind === 'open' && token.name === 'meta').forEach((token) => {
    const identities = [
      ...allAttributes(token.attributes, 'name'),
      ...allAttributes(token.attributes, 'property'),
    ].map((value) => value.toLowerCase());
    const content = firstAttribute(token.attributes, 'content') || '';
    identities.forEach((identity) => {
      if (routeSpecificMeta.has(identity)) {
        addError(scope, `generic SPA fallback must not contain route-specific ${identity} metadata`);
      }
      if (['robots', 'googlebot', 'bingbot'].includes(identity)) {
        const directives = content.toLowerCase().split(/[,\s]+/u).filter(Boolean);
        if (!directives.includes('noindex') && !directives.includes('none')) {
          addError(scope, `generic SPA fallback ${identity} metadata must not allow indexing (found: ${content})`);
        }
      }
    });
  });

  const jsonLdScripts = tokens.filter((token) => {
    if (token.kind !== 'open' || token.name !== 'script') return false;
    const type = firstAttribute(token.attributes, 'type') || '';
    return type.split(';', 1)[0].trim().toLowerCase() === 'application/ld+json';
  });
  if (jsonLdScripts.length > 0) {
    addError(scope, 'generic SPA fallback must not contain route-specific JSON-LD');
  }

  const bodyIndex = tokens.findIndex((token) => token.kind === 'open' && token.name === 'body');
  if (bodyIndex < 0) {
    addError(scope, 'generic SPA fallback must contain a <body> element');
    return;
  }
  const bodyStart = tokens[bodyIndex].end + 1;
  const bodyClose = matchingClose(tokens, bodyIndex);
  const bodyEnd = bodyClose ? bodyClose.start : html.length;
  const bodyInner = html.slice(bodyStart, bodyEnd);
  if (hasMeaningfulRootContent(bodyInner)) {
    addError(scope, 'generic SPA fallback must not contain prerendered route content');
  }
}

function validateHtmlPage(entry, htmlPath, html) {
  const scope = outputLabel(outputRelative(htmlPath));
  const { tokens, issues } = scanHtml(html);
  issues.forEach((issue) => addError(scope, issue));

  const rootIndices = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => token.kind === 'open' && firstAttribute(token.attributes, 'id')?.toLowerCase() === 'root');
  if (rootIndices.length > 1) {
    addError(scope, `prerendered #root element must appear at most once (found ${rootIndices.length})`);
  } else if (rootIndices.length === 1) {
    const rootInner = elementInnerHtml(html, tokens, rootIndices[0].index);
    if (rootInner === null || !hasMeaningfulRootContent(rootInner)) {
      addError(scope, 'prerendered #root content must be non-empty');
    }
  }

  const titleTokens = tokens.filter((token) => token.kind === 'open' && token.name === 'title');
  let title = null;
  if (titleTokens.length !== 1) {
    addError(scope, `title element must appear exactly once (found ${titleTokens.length})`);
  } else {
    const inner = elementInnerHtml(html, tokens, tokens.indexOf(titleTokens[0]));
    title = inner === null ? '' : normalizeText(inner);
    if (!title) addError(scope, 'title element must contain meaningful text');
  }

  const description = metaValue(tokens, 'description', scope, 'meta description');
  const robots = metaValue(tokens, 'robots', scope, 'robots meta');
  if (robots) {
    const directives = robots.toLowerCase().split(/[,\s]+/u).filter(Boolean);
    if (directives.includes('noindex') || directives.includes('none')) {
      addError(scope, `robots meta must allow indexing (found: ${robots})`);
    }
  }

  const canonical = linkCanonicalValue(tokens, scope);
  const openGraph = {
    title: metaValue(tokens, 'og:title', scope, 'og:title meta'),
    description: metaValue(tokens, 'og:description', scope, 'og:description meta'),
    url: metaValue(tokens, 'og:url', scope, 'og:url meta'),
    type: metaValue(tokens, 'og:type', scope, 'og:type meta'),
  };
  const twitter = {
    title: metaValue(tokens, 'twitter:title', scope, 'twitter:title meta'),
    description: metaValue(tokens, 'twitter:description', scope, 'twitter:description meta'),
    card: metaValue(tokens, 'twitter:card', scope, 'twitter:card meta'),
  };

  const bodyIndex = tokens.findIndex((token) => token.kind === 'open' && token.name === 'body');
  let bodyStart = 0;
  let bodyEnd = html.length;
  if (bodyIndex >= 0) {
    bodyStart = tokens[bodyIndex].end + 1;
    const bodyClose = matchingClose(tokens, bodyIndex);
    if (bodyClose) bodyEnd = bodyClose.start;
    const bodyInner = html.slice(bodyStart, bodyEnd);
    if (!hasMeaningfulRootContent(bodyInner)) addError(scope, 'rendered body content must be non-empty');
  } else {
    addError(scope, 'rendered body must contain a <body> element');
  }
  const bodyH1Count = tokens.filter((token) => token.kind === 'open'
    && token.name === 'h1'
    && token.start >= bodyStart
    && token.start < bodyEnd).length;
  if (bodyH1Count < 1) addError(scope, 'rendered body must contain at least one <h1>');

  const urlAttributes = new Set(['src', 'href', 'srcset', 'action', 'poster', 'content']);
  tokens.filter((token) => token.kind === 'open').forEach((token) => token.attributes.forEach((attribute) => {
    if (urlAttributes.has(attribute.name) && /(?:\/src\/|\/@fs(?:\/|$))/iu.test(attribute.value)) {
      addError(scope, `development asset URL is not allowed: ${attribute.value}`);
    }
  }));
  if (/<(?:script|link)\b[^>]*(?:\/src\/|\/@fs(?:\/|["']))/iu.test(html)) {
    addError(scope, 'development /src/ or /@fs/ asset URL detected in rendered HTML');
  }

  validateJsonLd(html, tokens, scope);

  if (canonical && canonical !== entry.loc) {
    addError(scope, `canonical URL must exactly equal sitemap URL ${entry.loc} (found ${canonical})`);
  }
  if (canonical) {
    try {
      const canonicalUrl = new URL(canonical);
      if (canonicalUrl.pathname !== entry.pathname || canonicalUrl.search || canonicalUrl.hash) {
        addError(scope, `canonical URL pathname must exactly match sitemap pathname ${entry.pathname} (found ${canonical})`);
      }
    } catch {
      addError(scope, `canonical link must be an absolute URL (found ${canonical})`);
    }
  }
  if (openGraph.url && openGraph.url !== entry.loc) {
    addError(scope, `og:url must exactly equal sitemap URL ${entry.loc} (found ${openGraph.url})`);
  }
  if (openGraph.url) {
    try {
      const openGraphUrl = new URL(openGraph.url);
      if (openGraphUrl.pathname !== entry.pathname || openGraphUrl.search || openGraphUrl.hash) {
        addError(scope, `og:url pathname must exactly match sitemap pathname ${entry.pathname} (found ${openGraph.url})`);
      }
    } catch {
      addError(scope, `og:url must be an absolute URL (found ${openGraph.url})`);
    }
  }

  if (title) entry.title = title;
  if (description) entry.description = normalizeText(description);
  if (canonical) entry.canonical = canonical;
  counts.htmlPages += 1;
}

function validateNotFoundPage(htmlPath, html) {
  const scope = outputLabel(outputRelative(htmlPath));
  const { tokens, issues } = scanHtml(html);
  issues.forEach((issue) => addError(scope, issue));

  const rootIndices = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => token.kind === 'open' && firstAttribute(token.attributes, 'id')?.toLowerCase() === 'root');
  if (rootIndices.length > 1) {
    addError(scope, `404 #root element must appear at most once (found ${rootIndices.length})`);
  } else if (rootIndices.length === 1) {
    const rootInner = elementInnerHtml(html, tokens, rootIndices[0].index);
    if (rootInner === null || !hasMeaningfulRootContent(rootInner)) {
      addError(scope, '404 #root content must be non-empty and rendered');
    }
  }

  const titleTokens = tokens.filter((token) => token.kind === 'open' && token.name === 'title');
  let title = '';
  if (titleTokens.length !== 1) {
    addError(scope, `title element must appear exactly once (found ${titleTokens.length})`);
  } else {
    const inner = elementInnerHtml(html, tokens, tokens.indexOf(titleTokens[0]));
    title = inner === null ? '' : normalizeText(inner);
    if (!title) addError(scope, 'title element must contain meaningful text');
  }

  metaValue(tokens, 'description', scope, 'meta description');
  const robots = metaValue(tokens, 'robots', scope, 'robots meta');
  if (robots) {
    const directives = robots.toLowerCase().split(/[,\s]+/u).filter(Boolean);
    if (!directives.includes('noindex') && !directives.includes('none')) {
      addError(scope, `404 robots meta must include noindex (found: ${robots})`);
    }
  }

  // A 404 is not an indexable route, so canonical and og:url are optional;
  // social title/description/card metadata remain required and useful.
  metaValue(tokens, 'og:title', scope, 'og:title meta');
  metaValue(tokens, 'og:description', scope, 'og:description meta');
  metaValue(tokens, 'og:type', scope, 'og:type meta');
  metaValue(tokens, 'twitter:title', scope, 'twitter:title meta');
  metaValue(tokens, 'twitter:description', scope, 'twitter:description meta');
  metaValue(tokens, 'twitter:card', scope, 'twitter:card meta');

  const bodyIndex = tokens.findIndex((token) => token.kind === 'open' && token.name === 'body');
  let bodyStart = 0;
  let bodyEnd = html.length;
  if (bodyIndex >= 0) {
    bodyStart = tokens[bodyIndex].end + 1;
    const bodyClose = matchingClose(tokens, bodyIndex);
    if (bodyClose) bodyEnd = bodyClose.start;
    const bodyInner = html.slice(bodyStart, bodyEnd);
    if (!hasMeaningfulRootContent(bodyInner)) addError(scope, '404 rendered body content must be non-empty');
  } else {
    addError(scope, '404 response must contain a <body> element');
  }

  const h1Tokens = tokens.filter((token) => token.kind === 'open'
    && token.name === 'h1'
    && token.start >= bodyStart
    && token.start < bodyEnd);
  if (h1Tokens.length < 1) addError(scope, '404 rendered body must contain at least one <h1>');

  const bodySource = bodyEnd > bodyStart ? html.slice(bodyStart, bodyEnd) : '';
  const bodyText = normalizeText(bodySource
    .replace(/<!--[\s\S]*?-->/gu, ' ')
    .replace(/<script\b[\s\S]*?<\/script\s*>/giu, ' ')
    .replace(/<style\b[\s\S]*?<\/style\s*>/giu, ' '));
  if (!/(?:\b404\b|not\s+found|page\s+(?:is\s+)?missing|couldn['’]?t\s+find)/iu.test(bodyText)) {
    addError(scope, '404 rendered body must contain real missing-page content');
  }

  const urlAttributes = new Set(['src', 'href', 'srcset', 'action', 'poster', 'content']);
  tokens.filter((token) => token.kind === 'open').forEach((token) => token.attributes.forEach((attribute) => {
    if (urlAttributes.has(attribute.name) && /(?:\/src\/|\/@fs(?:\/|$))/iu.test(attribute.value)) {
      addError(scope, `development asset URL is not allowed: ${attribute.value}`);
    }
  }));
  if (/<(?:script|link)\b[^>]*(?:\/src\/|\/@fs(?:\/|["']))/iu.test(html)) {
    addError(scope, 'development /src/ or /@fs/ asset URL detected in rendered HTML');
  }

  // Framework output may omit JSON-LD on a 404. Validate it when present.
  validateJsonLd(html, tokens, scope, { required: false });
  if (title) counts.notFoundPages += 1;
}

function validateOutputExactness(entries, routeOutputs) {
  const sitemapPaths = new Set();
  entries.forEach((entry) => {
    sitemapPaths.add(entry.pathname);
    sitemapPaths.add(entry.decodedPath);
  });

  routeOutputs.forEach((candidate, pathname) => {
    if (!sitemapPaths.has(pathname)) {
      addError(outputLabel(outputRelative(candidate.path)), `HTML output route ${pathname} has no corresponding sitemap URL`);
    }
  });
}

function validateRouteShape(entries) {
  const paths = new Set(entries.map((entry) => entry.pathname));
  if (entries.length !== EXPECTED_INDEXABLE_PAGE_COUNT) {
    addError(sitemapLabel, `expected exactly ${EXPECTED_INDEXABLE_PAGE_COUNT} indexable canonical pages (found ${entries.length})`);
  }
  STATIC_PATHS.forEach((path) => {
    if (!paths.has(path)) addError(sitemapLabel, `required canonical static route is missing: ${path}`);
  });

  const detailFamilies = [
    ['/events/', 'event'],
    ['/press-releases/', 'press-release'],
    ['/past-tests/', 'past-test'],
  ];
  detailFamilies.forEach(([prefix, label]) => {
    const matches = entries.filter((entry) => entry.pathname.startsWith(prefix)
      && entry.pathname.slice(prefix.length).length > 0
      && !entry.pathname.slice(prefix.length).includes('/'));
    if (matches.length === 0) addError(sitemapLabel, `at least one ${label} detail route is required under ${prefix}`);
  });

  entries.forEach((entry) => {
    const path = entry.pathname;
    const isStatic = STATIC_PATHS.includes(path);
    const isDetail = detailFamilies.some(([prefix]) => path.startsWith(prefix)
      && path.slice(prefix.length).length > 0
      && !path.slice(prefix.length).includes('/'));
    if (!isStatic && !isDetail) addError(sitemapLabel, `unsupported canonical route in sitemap: ${path}`);
  });
}

function validateRobots() {
  const pathname = join(CLIENT_ROOT, 'robots.txt');
  if (!isFile(pathname)) {
    addError(outputLabel('robots.txt'), 'file is required');
    return;
  }
  const source = readText(pathname, outputLabel('robots.txt'));
  if (source === null) return;

  const lines = source.split(/\r?\n/u);
  let sitemapReference = false;
  lines.forEach((line) => {
    const withoutComment = line.replace(/#.*$/u, '').trim();
    const disallow = /^disallow\s*:\s*(.*)$/iu.exec(withoutComment);
    if (disallow && disallow[1].trim() === '/') addError(outputLabel('robots.txt'), 'must not disallow the site root (Disallow: /)');
    const sitemap = /^sitemap\s*:\s*(\S+)\s*$/iu.exec(withoutComment);
    if (sitemap) {
      try {
        const url = new URL(sitemap[1]);
        if (url.href === SITEMAP_URL) sitemapReference = true;
      } catch {
        addError(outputLabel('robots.txt'), `Sitemap reference is not a valid URL: ${sitemap[1]}`);
      }
    }
  });

  if (!sitemapReference) addError(outputLabel('robots.txt'), `must reference the canonical sitemap ${SITEMAP_URL}`);
}

function validateContentAliases() {
  CONTENT_ROUTE_FAMILIES.forEach(({ directory, prefix }) => {
    if (!existsSync(directory)) return;

    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      addError(relative(PROJECT_ROOT, directory), `unable to inspect content directory: ${detail}`);
      return;
    }

    entries.filter((entry) => entry.isDirectory()).forEach((entry) => {
      const pathname = join(directory, entry.name, 'index.md');
      if (!isFile(pathname)) return;

      const scope = relative(PROJECT_ROOT, pathname).split('\\').join('/');
      const source = readText(pathname, scope);
      if (source === null) return;

      const canonicalPath = `${prefix}${slugifyRouteSegment(entry.name)}`;
      const aliases = splitFrontMatterList(frontMatterValue(source, 'aliases'));
      aliases.forEach((alias) => {
        const aliasPath = `${prefix}${slugifyRouteSegment(alias)}`;
        if (aliasPath === canonicalPath) {
          addError(scope, `content alias "${alias}" resolves to its canonical route; remove the redundant alias`);
          return;
        }

        if (EXPECTED_REDIRECTS.get(aliasPath) !== canonicalPath) {
          addError(scope, `content alias "${alias}" requires redirect ${aliasPath} -> ${canonicalPath} in redirects.json`);
        }
      });
    });
  });
}

function validateRedirects(entries) {
  const pathname = join(CLIENT_ROOT, '_redirects');
  const scope = outputLabel('_redirects');
  if (!isFile(pathname)) {
    addError(scope, 'Cloudflare static redirect file is required');
    return;
  }

  const source = readText(pathname, scope);
  if (source === null) return;

  const redirects = new Map();
  source.split(/\r?\n/u).forEach((line, index) => {
    const value = line.replace(/#.*$/u, '').trim();
    if (!value) return;
    const fields = value.split(/\s+/u);
    if (fields.length !== 3 || fields[2] !== '301') {
      addError(scope, `line ${index + 1} must be a source, destination, and 301 status`);
      return;
    }
    if (redirects.has(fields[0])) {
      addError(scope, `duplicate redirect source on line ${index + 1}: ${fields[0]}`);
      return;
    }
    redirects.set(fields[0], fields[1]);
  });

  EXPECTED_REDIRECTS.forEach((destination, sourcePath) => {
    const actual = redirects.get(sourcePath);
    if (actual !== destination) {
      addError(scope, `required permanent redirect is missing: ${sourcePath} -> ${destination}`);
    }
  });

  redirects.forEach((destination, sourcePath) => {
    if (EXPECTED_REDIRECTS.get(sourcePath) !== destination) {
      addError(scope, `redirect is not mirrored by the Worker: ${sourcePath} -> ${destination}`);
    }
  });

  const canonicalPaths = new Set(entries.map((entry) => entry.pathname));
  EXPECTED_REDIRECTS.forEach((destination, sourcePath) => {
    if (!canonicalPaths.has(destination)) {
      addError(scope, `redirect destination is not a canonical sitemap route: ${sourcePath} -> ${destination}`);
    }
  });
}

function listXmlCandidates(directory, prefix = '') {
  if (!existsSync(directory)) return [];
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  const result = [];
  entries.forEach((entry) => {
    const path = join(directory, entry.name);
    const relativeName = prefix ? join(prefix, entry.name) : entry.name;
    if (entry.isDirectory()) result.push(...listXmlCandidates(path, relativeName));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.xml')) result.push({ path, relativeName });
  });
  return result;
}

function chooseFeedFile() {
  const preferred = [
    'feed.xml',
    'rss.xml',
    'atom.xml',
    'press-releases.xml',
    join('press-releases', 'feed.xml'),
  ];
  for (const relativeName of preferred) {
    const pathname = join(CLIENT_ROOT, relativeName);
    if (isFile(pathname)) return { path: pathname, relativeName };
  }

  const candidates = listXmlCandidates(CLIENT_ROOT)
    .filter(({ relativeName }) => relativeName !== 'sitemap.xml');
  for (const candidate of candidates) {
    const source = readText(candidate.path, outputLabel(candidate.relativeName));
    if (source && /<\s*(?:rss|feed)\b/iu.test(source)) return candidate;
  }
  return null;
}

function descendantTokens(tokens, parent) {
  const descendants = [];
  tokens.forEach((token) => {
    let current = token.parent;
    while (current) {
      if (current === parent) {
        descendants.push(token);
        break;
      }
      current = current.parent;
    }
  });
  return descendants;
}

function parseFeedUrl(value) {
  const text = decodeEntities(value).trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:' || url.origin !== ORIGIN || url.search || url.hash) return { text, url, canonical: false };
    return { text, url, canonical: true };
  } catch {
    return null;
  }
}

function validateFeed(entries) {
  const feed = chooseFeedFile();
  if (!feed) {
    addError(outputLabel('feed.xml'), 'generated XML feed is required (expected feed.xml, rss.xml, atom.xml, or an equivalent feed file)');
    return;
  }

  const feedScope = outputLabel(feed.relativeName);
  const source = readText(feed.path, feedScope);
  if (source === null || !source.trim()) {
    addError(feedScope, 'feed is empty');
    return;
  }

  const { tokens, issues } = scanXml(source);
  issues.forEach((issue) => addError(feedScope, issue));
  const roots = tokens.filter((token) => !token.parent);
  if (roots.length !== 1) {
    addError(feedScope, `expected exactly one XML feed root (found ${roots.length})`);
    return;
  }
  const rootName = localXmlName(roots[0].name);
  if (rootName !== 'rss' && rootName !== 'feed') {
    addError(feedScope, `root element must be <rss> or <feed> (found <${roots[0].name}>)`);
    return;
  }

  const canonicalPressUrls = new Set(entries
    .filter((entry) => entry.pathname.startsWith('/press-releases/'))
    .map((entry) => entry.loc));
  const itemTokens = tokens.filter((token) => {
    const name = localXmlName(token.name);
    return token.parent && (name === 'item' || name === 'entry');
  });
  if (itemTokens.length === 0) addError(feedScope, 'feed must contain at least one RSS <item> or Atom <entry>');

  let matchingItems = 0;
  itemTokens.forEach((item, index) => {
    const scope = `${feedScope} entry #${index + 1}`;
    if (!item.close) {
      addError(scope, 'feed entry is not closed');
      return;
    }
    const descendants = descendantTokens(tokens, item);
    const urlCandidates = [];
    descendants.forEach((token) => {
      const name = localXmlName(token.name);
      if (!['link', 'guid', 'id'].includes(name)) return;
      const href = firstAttribute(token.attributes, 'href');
      const value = href || xmlElementText(source, token);
      const parsed = parseFeedUrl(value);
      if (parsed) urlCandidates.push(parsed);
    });

    const matchingUrls = urlCandidates.filter((candidate) => candidate.canonical
      && candidate.url.pathname.startsWith('/press-releases/'));
    if (matchingUrls.length === 0) return;

    matchingItems += 1;
    const uniqueUrls = new Set(matchingUrls.map((candidate) => candidate.text));
    uniqueUrls.forEach((url) => {
      counts.feedUrls += 1;
      if (!canonicalPressUrls.has(url)) {
        addError(scope, `press-release URL must exactly match a canonical sitemap URL: ${url}`);
      }
    });

    const dateValues = descendants
      .filter((token) => ['pubdate', 'published', 'updated', 'date'].includes(localXmlName(token.name)))
      .map((token) => xmlElementText(source, token).trim())
      .filter(Boolean);
    const hasParseableDate = dateValues.some((value) => !Number.isNaN(Date.parse(value)));
    if (!hasParseableDate) addError(scope, 'canonical press-release entry must contain a parseable publication date');
  });

  counts.feedEntries = matchingItems;
  if (matchingItems === 0) {
    addError(feedScope, 'feed must contain at least one canonical press-release URL');
  }
}

function validateUniqueMetadata(entries) {
  const titles = new Map();
  const descriptions = new Map();
  const canonicals = new Map();
  entries.forEach((entry) => {
    if (entry.title) {
      const previous = titles.get(entry.title);
      if (previous) addError(`${sitemapLabel} ${entry.pathname}`, `duplicate page title "${entry.title}" (also used by ${previous})`);
      else titles.set(entry.title, entry.pathname);
    }
    if (entry.description) {
      const previous = descriptions.get(entry.description);
      if (previous) addError(`${sitemapLabel} ${entry.pathname}`, `duplicate meta description "${entry.description}" (also used by ${previous})`);
      else descriptions.set(entry.description, entry.pathname);
    }
    if (entry.canonical) {
      const previous = canonicals.get(entry.canonical);
      if (previous) addError(`${sitemapLabel} ${entry.pathname}`, `duplicate canonical URL "${entry.canonical}" (also used by ${previous})`);
      else canonicals.set(entry.canonical, entry.pathname);
    }
  });
}

function main() {
  if (!existsSync(CLIENT_ROOT)) {
    addError('dist/client/', 'React Router Framework Mode output directory is missing; run npm run build before SEO verification');
  }

  validateContentAliases();

  const discovered = discoverHtmlOutputs();
  validateSpaFallback();
  if (discovered.notFoundOutputs.length !== 1) {
    addError(outputLabel('404.html'), `exactly one root 404.html is required (found ${discovered.notFoundOutputs.length})`);
  } else {
    const notFoundPath = discovered.notFoundOutputs[0].path;
    const notFoundSource = readText(notFoundPath, outputLabel(outputRelative(notFoundPath)));
    if (notFoundSource !== null) validateNotFoundPage(notFoundPath, notFoundSource);
  }

  const sitemapPath = join(CLIENT_ROOT, 'sitemap.xml');
  const sitemapSource = isFile(sitemapPath) ? readText(sitemapPath, sitemapLabel) : null;
  if (sitemapSource === null && existsSync(CLIENT_ROOT)) {
    addError(sitemapLabel, 'file is required');
  }

  let entries = [];
  if (sitemapSource !== null) {
    entries = parseSitemap(sitemapSource, sitemapPath);
    validateRouteShape(entries);
    validateOutputExactness(entries, discovered.routeOutputs);

    entries.forEach((entry) => {
      const candidate = discovered.routeOutputs.get(entry.decodedPath)
        || discovered.routeOutputs.get(entry.pathname);
      if (!candidate) {
        addError(`${sitemapLabel} ${entry.pathname}`, `HTML output required for sitemap URL ${entry.loc}`);
        return;
      }
      const html = readText(candidate.path, outputLabel(outputRelative(candidate.path)));
      if (html !== null) validateHtmlPage(entry, candidate.path, html);
    });

    validateUniqueMetadata(entries);
  }

  if (existsSync(CLIENT_ROOT)) {
    validateRobots();
    validateRedirects(entries);
    validateFeed(entries);
  }

  if (errors.length > 0) {
    console.error(`SEO verification failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}.`);
    errors.forEach((error) => console.error(`- ${error}`));
    console.error(`Checked ${counts.sitemapUrls} sitemap URL${counts.sitemapUrls === 1 ? '' : 's'}, ${counts.htmlPages} indexable HTML page${counts.htmlPages === 1 ? '' : 's'}, ${counts.notFoundPages} noindex 404 page${counts.notFoundPages === 1 ? '' : 's'}, ${counts.jsonLdScripts} JSON-LD script${counts.jsonLdScripts === 1 ? '' : 's'}, and ${counts.feedEntries} feed entr${counts.feedEntries === 1 ? 'y' : 'ies'}.`);
    process.exitCode = 1;
    return;
  }

  console.log(`SEO verification passed: ${counts.sitemapUrls} sitemap URL${counts.sitemapUrls === 1 ? '' : 's'}, ${counts.htmlPages} indexable HTML page${counts.htmlPages === 1 ? '' : 's'}, ${counts.notFoundPages} noindex 404 page${counts.notFoundPages === 1 ? '' : 's'}, ${counts.jsonLdScripts} JSON-LD script${counts.jsonLdScripts === 1 ? '' : 's'}, and ${counts.feedEntries} canonical feed entr${counts.feedEntries === 1 ? 'y' : 'ies'}.`);
}

main();

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_ROOT = process.env.SEO_CHECK_ROOT
  ? resolve(process.env.SEO_CHECK_ROOT)
  : SCRIPT_ROOT;
const DIST_ROOT = join(PROJECT_ROOT, 'dist');
const ORIGIN = 'https://seattleinfinity.org';
const SITEMAP_URL = `${ORIGIN}/sitemap.xml`;

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

const KNOWN_ALIASES = new Set([
  '/about',
  '/slg',
  '/mock-tests',
  '/newsletter',
  '/newletter',
  '/gcalender',
  '/calender',
  '/announcement',
  '/announcements/mathcounts',
]);

const errors = [];
const counts = {
  sitemapUrls: 0,
  htmlPages: 0,
  jsonLdScripts: 0,
  feedEntries: 0,
  feedUrls: 0,
};

function addError(scope, message) {
  errors.push(`${scope}: ${message}`);
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

function validateJsonLd(html, tokens, scope) {
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
    addError(scope, 'at least one application/ld+json script is required');
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
    addError('dist/sitemap.xml', 'file is empty');
    return [];
  }

  const { tokens, issues } = scanXml(source);
  issues.forEach((issue) => addError('dist/sitemap.xml', issue));

  const roots = tokens.filter((token) => !token.parent);
  if (roots.length !== 1) {
    addError('dist/sitemap.xml', `expected exactly one XML root element (found ${roots.length})`);
    return [];
  }

  const root = roots[0];
  if (localXmlName(root.name) !== 'urlset') {
    addError('dist/sitemap.xml', `root element must be <urlset> (found <${root.name}>)`);
    return [];
  }
  if (!root.close) addError('dist/sitemap.xml', 'root <urlset> must have a closing tag');

  const namespace = firstAttribute(root.attributes, 'xmlns');
  if (namespace !== 'http://www.sitemaps.org/schemas/sitemap/0.9') {
    addError('dist/sitemap.xml', 'root <urlset> must declare the sitemap 0.9 namespace');
  }

  if (root.start > 0) {
    const before = source.slice(0, root.start)
      .replace(/<\?[\s\S]*?\?>/gu, '')
      .replace(/<!--[\s\S]*?-->/gu, '')
      .trim();
    if (before) addError('dist/sitemap.xml', 'non-whitespace content appears before the root element');
  }
  if (root.close) {
    const after = source.slice(root.close.end + 1)
      .replace(/<!--[\s\S]*?-->/gu, '')
      .trim();
    if (after) addError('dist/sitemap.xml', 'non-whitespace content appears after the root element');
  }

  const urls = tokens.filter((token) => token.parent === root && localXmlName(token.name) === 'url');
  if (urls.length === 0) addError('dist/sitemap.xml', 'sitemap must contain at least one <url> entry');

  const entries = [];
  const seenLocs = new Map();
  const seenPaths = new Map();

  urls.forEach((urlToken, index) => {
    const scope = `dist/sitemap.xml url #${index + 1}`;
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
    if (KNOWN_ALIASES.has(path.toLowerCase())) {
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

function routeHtmlPath(pathname) {
  if (pathname === '/') return join(DIST_ROOT, 'index.html');
  const route = pathname.replace(/^\//u, '');
  const output = join(DIST_ROOT, `${route}.html`);
  const relativeOutput = relative(DIST_ROOT, output);
  if (relativeOutput.startsWith('..') || relativeOutput.includes('\\')) return null;
  return output;
}

function validateHtmlPage(entry, htmlPath, html) {
  const scope = `dist/${relative(DIST_ROOT, htmlPath)}`;
  const { tokens, issues } = scanHtml(html);
  issues.forEach((issue) => addError(scope, issue));

  const rootIndices = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => token.kind === 'open' && firstAttribute(token.attributes, 'id')?.toLowerCase() === 'root');
  if (rootIndices.length !== 1) {
    addError(scope, `prerendered #root element must appear exactly once (found ${rootIndices.length})`);
  } else {
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
    if (urlAttributes.has(attribute.name) && /\/src\//iu.test(attribute.value)) {
      addError(scope, `development asset URL is not allowed: ${attribute.value}`);
    }
  }));
  if (/<(?:script|link)\b[^>]*\/src\//iu.test(html)) {
    addError(scope, 'development /src/ asset URL detected in rendered HTML');
  }

  validateJsonLd(html, tokens, scope);

  if (canonical && canonical !== entry.loc) {
    addError(scope, `canonical URL must exactly equal sitemap URL ${entry.loc} (found ${canonical})`);
  }
  if (openGraph.url && openGraph.url !== entry.loc) {
    addError(scope, `og:url must exactly equal sitemap URL ${entry.loc} (found ${openGraph.url})`);
  }

  if (title) entry.title = title;
  if (description) entry.description = normalizeText(description);
  counts.htmlPages += 1;
}

function validateRouteShape(entries) {
  const paths = new Set(entries.map((entry) => entry.pathname));
  STATIC_PATHS.forEach((path) => {
    if (!paths.has(path)) addError('dist/sitemap.xml', `required canonical static route is missing: ${path}`);
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
    if (matches.length === 0) addError('dist/sitemap.xml', `at least one ${label} detail route is required under ${prefix}`);
  });

  entries.forEach((entry) => {
    const path = entry.pathname;
    const isStatic = STATIC_PATHS.includes(path);
    const isDetail = detailFamilies.some(([prefix]) => path.startsWith(prefix)
      && path.slice(prefix.length).length > 0
      && !path.slice(prefix.length).includes('/'));
    if (!isStatic && !isDetail) addError('dist/sitemap.xml', `unsupported canonical route in sitemap: ${path}`);
  });
}

function validateRobots() {
  const pathname = join(DIST_ROOT, 'robots.txt');
  if (!isFile(pathname)) {
    addError('dist/robots.txt', 'file is required');
    return;
  }
  const source = readText(pathname, 'dist/robots.txt');
  if (source === null) return;

  const lines = source.split(/\r?\n/u);
  let sitemapReference = false;
  lines.forEach((line) => {
    const withoutComment = line.replace(/#.*$/u, '').trim();
    const disallow = /^disallow\s*:\s*(.*)$/iu.exec(withoutComment);
    if (disallow && disallow[1].trim() === '/') addError('dist/robots.txt', 'must not disallow the site root (Disallow: /)');
    const sitemap = /^sitemap\s*:\s*(\S+)\s*$/iu.exec(withoutComment);
    if (sitemap) {
      try {
        const url = new URL(sitemap[1]);
        if (url.href === SITEMAP_URL) sitemapReference = true;
      } catch {
        addError('dist/robots.txt', `Sitemap reference is not a valid URL: ${sitemap[1]}`);
      }
    }
  });

  if (!sitemapReference) addError('dist/robots.txt', `must reference the canonical sitemap ${SITEMAP_URL}`);
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
    const pathname = join(DIST_ROOT, relativeName);
    if (isFile(pathname)) return { path: pathname, relativeName };
  }

  const candidates = listXmlCandidates(DIST_ROOT)
    .filter(({ relativeName }) => relativeName !== 'sitemap.xml');
  for (const candidate of candidates) {
    const source = readText(candidate.path, `dist/${candidate.relativeName}`);
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
    addError('dist/feed.xml', 'generated XML feed is required (expected feed.xml, rss.xml, atom.xml, or an equivalent feed file)');
    return;
  }

  const source = readText(feed.path, `dist/${feed.relativeName}`);
  if (source === null || !source.trim()) {
    addError(`dist/${feed.relativeName}`, 'feed is empty');
    return;
  }

  const { tokens, issues } = scanXml(source);
  issues.forEach((issue) => addError(`dist/${feed.relativeName}`, issue));
  const roots = tokens.filter((token) => !token.parent);
  if (roots.length !== 1) {
    addError(`dist/${feed.relativeName}`, `expected exactly one XML feed root (found ${roots.length})`);
    return;
  }
  const rootName = localXmlName(roots[0].name);
  if (rootName !== 'rss' && rootName !== 'feed') {
    addError(`dist/${feed.relativeName}`, `root element must be <rss> or <feed> (found <${roots[0].name}>)`);
    return;
  }

  const canonicalPressUrls = new Set(entries
    .filter((entry) => entry.pathname.startsWith('/press-releases/'))
    .map((entry) => entry.loc));
  const itemTokens = tokens.filter((token) => {
    const name = localXmlName(token.name);
    return token.parent && (name === 'item' || name === 'entry');
  });
  if (itemTokens.length === 0) addError(`dist/${feed.relativeName}`, 'feed must contain at least one RSS <item> or Atom <entry>');

  let matchingItems = 0;
  itemTokens.forEach((item, index) => {
    const scope = `dist/${feed.relativeName} entry #${index + 1}`;
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
    addError(`dist/${feed.relativeName}`, 'feed must contain at least one canonical press-release URL');
  }
}

function validateUniqueMetadata(entries) {
  const titles = new Map();
  const descriptions = new Map();
  entries.forEach((entry) => {
    if (entry.title) {
      const previous = titles.get(entry.title);
      if (previous) addError(`dist/sitemap.xml ${entry.pathname}`, `duplicate page title "${entry.title}" (also used by ${previous})`);
      else titles.set(entry.title, entry.pathname);
    }
    if (entry.description) {
      const previous = descriptions.get(entry.description);
      if (previous) addError(`dist/sitemap.xml ${entry.pathname}`, `duplicate meta description "${entry.description}" (also used by ${previous})`);
      else descriptions.set(entry.description, entry.pathname);
    }
  });
}

function main() {
  if (!existsSync(DIST_ROOT)) {
    addError('dist/', 'production output directory is missing; run npm run build before SEO verification');
  }

  const sitemapPath = join(DIST_ROOT, 'sitemap.xml');
  const sitemapSource = isFile(sitemapPath) ? readText(sitemapPath, 'dist/sitemap.xml') : null;
  if (sitemapSource === null && existsSync(DIST_ROOT)) {
    addError('dist/sitemap.xml', 'file is required');
  }

  let entries = [];
  if (sitemapSource !== null) {
    entries = parseSitemap(sitemapSource, sitemapPath);
    validateRouteShape(entries);

    entries.forEach((entry) => {
      const htmlPath = routeHtmlPath(entry.decodedPath);
      if (!htmlPath) {
        addError(`dist/sitemap.xml ${entry.pathname}`, 'could not safely map pathname to a flat .html output');
        return;
      }
      if (!isFile(htmlPath)) {
        addError(`dist/${relative(DIST_ROOT, htmlPath)}`, `HTML output required for sitemap URL ${entry.loc}`);
        return;
      }
      const html = readText(htmlPath, `dist/${relative(DIST_ROOT, htmlPath)}`);
      if (html !== null) validateHtmlPage(entry, htmlPath, html);
    });

    validateUniqueMetadata(entries);
  }

  if (existsSync(DIST_ROOT)) {
    validateRobots();
    validateFeed(entries);
  }

  if (errors.length > 0) {
    console.error(`SEO verification failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}.`);
    errors.forEach((error) => console.error(`- ${error}`));
    console.error(`Checked ${counts.sitemapUrls} sitemap URL${counts.sitemapUrls === 1 ? '' : 's'}, ${counts.htmlPages} HTML page${counts.htmlPages === 1 ? '' : 's'}, ${counts.jsonLdScripts} JSON-LD script${counts.jsonLdScripts === 1 ? '' : 's'}, and ${counts.feedEntries} feed entr${counts.feedEntries === 1 ? 'y' : 'ies'}.`);
    process.exitCode = 1;
    return;
  }

  console.log(`SEO verification passed: ${counts.sitemapUrls} sitemap URL${counts.sitemapUrls === 1 ? '' : 's'}, ${counts.htmlPages} HTML page${counts.htmlPages === 1 ? '' : 's'}, ${counts.jsonLdScripts} JSON-LD script${counts.jsonLdScripts === 1 ? '' : 's'}, and ${counts.feedEntries} canonical feed entr${counts.feedEntries === 1 ? 'y' : 'ies'}.`);
}

main();

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDirectory, '..');
const clientDirectory = path.resolve(
  process.env.SEO_CLIENT_DIR || path.join(projectRoot, 'dist', 'client'),
);

const DEFAULT_SITE_NAME = 'Seattle Infinity Math Circle';
const DEFAULT_SITE_DESCRIPTION = 'Seattle Infinity Math Circle inspires students across the Seattle area to explore mathematics through competitions, events, and community.';
const FALLBACK_DOCUMENT_NAMES = new Set(['__spa-fallback.html', '__spa-fallback.htm']);

const fail = (message) => {
  throw new Error(`[generate-seo-assets] ${message}`);
};

const textValue = (...values) => values.find((value) => typeof value === 'string' && value.trim())?.trim() || '';

function decodeEntities(value) {
  return String(value).replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/giu, (whole, entity) => {
    const lower = entity.toLowerCase();
    if (lower === 'amp') return '&';
    if (lower === 'lt') return '<';
    if (lower === 'gt') return '>';
    if (lower === 'quot') return '"';
    if (lower === 'apos') return "'";
    if (lower === 'nbsp') return '\u00a0';

    const codePoint = lower.startsWith('#x')
      ? Number.parseInt(lower.slice(2), 16)
      : Number.parseInt(lower.slice(1), 10);
    if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return whole;
    try {
      return String.fromCodePoint(codePoint);
    } catch {
      return whole;
    }
  });
}

function findTagEnd(source, start) {
  let quote = '';
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = '';
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index;
    }
  }
  return -1;
}

function parseAttributes(source) {
  const attributes = [];
  let index = 0;

  while (index < source.length) {
    while (index < source.length && /\s/u.test(source[index])) index += 1;
    while (index < source.length && source[index] === '/') index += 1;
    while (index < source.length && /\s/u.test(source[index])) index += 1;
    if (index >= source.length) break;

    const nameStart = index;
    while (index < source.length && !/[\s=/>]/u.test(source[index])) index += 1;
    if (nameStart === index) {
      index += 1;
      continue;
    }

    const name = source.slice(nameStart, index).toLowerCase();
    while (index < source.length && /\s/u.test(source[index])) index += 1;

    let value = '';
    if (source[index] === '=') {
      index += 1;
      while (index < source.length && /\s/u.test(source[index])) index += 1;
      if (source[index] === '"' || source[index] === "'") {
        const quote = source[index];
        index += 1;
        const valueStart = index;
        while (index < source.length && source[index] !== quote) index += 1;
        value = source.slice(valueStart, index);
        if (index < source.length) index += 1;
      } else {
        const valueStart = index;
        while (index < source.length && !/[\s>]/u.test(source[index])) index += 1;
        value = source.slice(valueStart, index).replace(/\/$/u, '');
      }
    }

    attributes.push({ name, value: decodeEntities(value) });
  }

  return attributes;
}

function parseOpenTag(raw) {
  let index = 1;
  while (index < raw.length && /\s/u.test(raw[index])) index += 1;
  if (raw[index] === '/' || raw[index] === '!' || raw[index] === '?') return null;

  const nameStart = index;
  while (index < raw.length && !/[\s/>]/u.test(raw[index])) index += 1;
  if (nameStart === index) return null;

  const name = raw.slice(nameStart, index).toLowerCase();
  const attributesEnd = raw.length - 1;
  let attributesSource = raw.slice(index, attributesEnd);
  const selfClosing = /\/\s*$/u.test(attributesSource);
  if (selfClosing) attributesSource = attributesSource.replace(/\/\s*$/u, '');

  return {
    name,
    attributes: parseAttributes(attributesSource),
    selfClosing,
  };
}

function findClosingTag(source, name, start) {
  const lowerSource = source.toLowerCase();
  const lowerName = name.toLowerCase();
  let cursor = start;
  while (cursor < source.length) {
    const candidate = lowerSource.indexOf(`</${lowerName}`, cursor);
    if (candidate < 0) return null;
    const afterName = source[candidate + lowerName.length + 2] || '';
    if (afterName === '>' || /\s/u.test(afterName)) {
      const end = findTagEnd(source, candidate);
      return end < 0 ? { start: candidate, end: -1 } : { start: candidate, end };
    }
    cursor = candidate + 2;
  }
  return null;
}

function scanHtml(source, relativeName) {
  const tags = [];
  const issues = [];
  let cursor = 0;
  let inHead = false;
  let sawHead = false;

  while (cursor < source.length) {
    const start = source.indexOf('<', cursor);
    if (start < 0) break;

    if (source.startsWith('<!--', start)) {
      const endComment = source.indexOf('-->', start + 4);
      if (endComment < 0) {
        issues.push('unterminated HTML comment');
        break;
      }
      cursor = endComment + 3;
      continue;
    }

    const end = findTagEnd(source, start);
    if (end < 0) {
      issues.push(`unterminated HTML tag near byte ${start}`);
      break;
    }

    const raw = source.slice(start, end + 1);
    let closeName = '';
    let closeIndex = 1;
    while (closeIndex < raw.length && /\s/u.test(raw[closeIndex])) closeIndex += 1;
    if (raw[closeIndex] === '/') {
      closeIndex += 1;
      while (closeIndex < raw.length && /\s/u.test(raw[closeIndex])) closeIndex += 1;
      const closeNameStart = closeIndex;
      while (closeIndex < raw.length && !/[\s>]/u.test(raw[closeIndex])) closeIndex += 1;
      closeName = raw.slice(closeNameStart, closeIndex).toLowerCase();
    }

    if (closeName) {
      if (closeName === 'head') inHead = false;
      cursor = end + 1;
      continue;
    }

    const parsed = parseOpenTag(raw);
    if (!parsed) {
      cursor = end + 1;
      continue;
    }

    if (parsed.name === 'head') {
      sawHead = true;
      inHead = true;
    }

    const tag = {
      ...parsed,
      inHead,
      content: '',
      start,
      end,
    };
    tags.push(tag);

    if ((parsed.name === 'script' || parsed.name === 'title') && !parsed.selfClosing) {
      const closing = findClosingTag(source, parsed.name, end + 1);
      if (!closing || closing.end < 0) {
        issues.push(`unterminated <${parsed.name}> element`);
        break;
      }
      tag.content = source.slice(end + 1, closing.start);
      cursor = closing.end + 1;
      continue;
    }

    cursor = end + 1;
  }

  if (issues.length > 0) {
    fail(`${relativeName}: ${issues.join('; ')}`);
  }

  const relevantTags = sawHead ? tags.filter((tag) => tag.inHead) : tags;
  const getAttribute = (tag, name) => tag.attributes.find((attribute) => attribute.name === name)?.value || '';
  const metaTags = relevantTags.filter((tag) => tag.name === 'meta');
  const canonicalLinks = relevantTags
    .filter((tag) => tag.name === 'link' && getAttribute(tag, 'rel').split(/\s+/u).some((value) => value.toLowerCase() === 'canonical'))
    .map((tag) => getAttribute(tag, 'href'));
  const jsonLdScripts = relevantTags
    .filter((tag) => tag.name === 'script' && getAttribute(tag, 'type').toLowerCase() === 'application/ld+json')
    .map((tag, index) => {
      const text = tag.content.trim();
      if (!text) fail(`${relativeName}: JSON-LD script #${index + 1} is empty.`);
      try {
        return JSON.parse(text);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        fail(`${relativeName}: JSON-LD script #${index + 1} is invalid JSON (${detail}).`);
      }
    });

  const firstMeta = (attributeName, attributeValue) => metaTags.find((tag) => (
    getAttribute(tag, attributeName).toLowerCase() === attributeValue.toLowerCase()
  ));
  const contentForMeta = (...queries) => {
    for (const [attributeName, attributeValue] of queries) {
      const tag = firstMeta(attributeName, attributeValue);
      const content = tag ? getAttribute(tag, 'content') : '';
      if (content) return content;
    }
    return '';
  };

  const titleTag = relevantTags.find((tag) => tag.name === 'title');
  const title = titleTag ? decodeEntities(titleTag.content.replace(/\s+/gu, ' ').trim()) : '';
  const robotsValues = metaTags
    .filter((tag) => ['robots', 'googlebot', 'bingbot'].includes(getAttribute(tag, 'name').toLowerCase()))
    .map((tag) => getAttribute(tag, 'content'));
  const noIndex = robotsValues.some((value) => /(?:^|[\s,;])(?:noindex|none)(?:$|[\s,;])/iu.test(value));

  return {
    canonicalLinks,
    description: contentForMeta(['name', 'description']),
    jsonLdScripts,
    metaTags,
    noIndex,
    ogDescription: contentForMeta(['property', 'og:description']),
    ogSiteName: contentForMeta(['property', 'og:site_name']),
    ogTitle: contentForMeta(['property', 'og:title']),
    publishedDate: contentForMeta(
      ['property', 'article:published_time'],
      ['name', 'article:published_time'],
      ['name', 'datepublished'],
      ['name', 'date'],
      ['name', 'pubdate'],
    ),
    title,
  };
}

function getRelativeName(filePath) {
  return path.relative(clientDirectory, filePath).split(path.sep).join('/');
}

function isIgnoredHtml(relativeName) {
  const segments = relativeName.split('/');
  const basename = segments.at(-1)?.toLowerCase() || '';
  if (FALLBACK_DOCUMENT_NAMES.has(basename)) return true;
  if (segments.some((segment) => segment === '.vite' || segment === 'assets' || segment === 'node_modules')) return true;
  return false;
}

function routePathFromFile(relativeName) {
  const segments = relativeName.split('/');
  const basename = segments.pop() || '';
  if (!basename.toLowerCase().endsWith('.html')) return '';
  const withoutExtension = basename.slice(0, -'.html'.length);
  if (withoutExtension.toLowerCase() === 'index') {
    return segments.length === 0 ? '/' : `/${segments.join('/')}`;
  }
  return `/${[...segments, withoutExtension].join('/')}`;
}

function validateOrigin(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${label} must be an absolute URL. Received: ${value}`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    fail(`${label} must be an HTTP(S) origin without credentials, path, query, or hash. Received: ${value}`);
  }
  return url.origin;
}

function normalisePathname(pathname, label) {
  if (!pathname.startsWith('/')) fail(`${label} pathname must begin with '/'. Received: ${pathname}`);
  if (pathname !== '/' && pathname.endsWith('/')) fail(`${label} pathname must not end with '/'. Received: ${pathname}`);
  if (pathname.includes('//') || pathname.includes('\\') || /%2f|%5c|%00/iu.test(pathname)) {
    fail(`${label} pathname contains a repeated slash, backslash, or encoded delimiter. Received: ${pathname}`);
  }
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    fail(`${label} pathname contains a malformed escape. Received: ${pathname}`);
  }
  if (decoded.split('/').some((segment) => segment === '.' || segment === '..')) {
    fail(`${label} pathname contains a dot segment. Received: ${pathname}`);
  }
  return pathname;
}

function normaliseCanonical(rawValue, baseOrigin, label) {
  const raw = textValue(rawValue);
  if (!raw) fail(`${label} has an empty canonical href.`);

  let url;
  try {
    url = new URL(raw, `${baseOrigin}/`);
  } catch {
    fail(`${label} has an invalid canonical URL: ${raw}`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    fail(`${label} canonical URL must be HTTP(S) without credentials, query, or hash: ${raw}`);
  }
  const pathname = normalisePathname(url.pathname, `${label} canonical`);
  return {
    href: url.toString(),
    origin: url.origin,
    pathname,
  };
}

function absoluteOriginFromCanonical(rawValue, expectedPath) {
  const raw = textValue(rawValue);
  if (!raw || raw.startsWith('/')) return '';
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    if (expectedPath && url.pathname !== expectedPath) return '';
    return url.origin;
  } catch {
    return '';
  }
}

function canonicalDocumentCandidate(relativeName, parsed) {
  if (isIgnoredHtml(relativeName)) return false;
  const sourcePath = routePathFromFile(relativeName);
  if (!sourcePath || sourcePath === '/404' || sourcePath.includes('*')) return false;
  if (parsed.noIndex) return false;
  return true;
}

async function collectHtmlFiles(root) {
  const files = [];
  async function visit(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      fail(`unable to read ${directory}: ${detail}`);
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.vite' || entry.name === 'assets' || entry.name === 'node_modules') continue;
        await visit(filePath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
        files.push(filePath);
      }
    }
  }
  await visit(root);
  return files;
}

async function readFileOrFail(filePath, label) {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    fail(`unable to read ${label || filePath}: ${detail}`);
  }
}

async function readBufferOrFail(filePath, label) {
  try {
    return await readFile(filePath);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    fail(`unable to read ${label || filePath}: ${detail}`);
  }
}

async function fileExists(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function directoryExists(directoryPath) {
  try {
    return (await stat(directoryPath)).isDirectory();
  } catch {
    return false;
  }
}

function findArticleNode(value) {
  const candidates = [];
  const seen = new Set();
  const visit = (node) => {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
    const normalisedTypes = types
      .filter((type) => typeof type === 'string')
      .map((type) => type.toLowerCase().split(/[/:#]/u).at(-1));
    if (normalisedTypes.includes('newsarticle')) candidates.push({ priority: 0, node });
    else if (normalisedTypes.includes('article')) candidates.push({ priority: 1, node });
    Object.values(node).forEach(visit);
  };
  visit(value);
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0]?.node || null;
}

function parseDate(value, label) {
  const raw = textValue(value);
  if (!raw) return null;
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) fail(`${label} has an invalid publication date: ${raw}`);
  return date;
}

function extractFeedEntry(document) {
  const article = document.parsed.jsonLdScripts.map(findArticleNode).find(Boolean);
  const title = textValue(
    article?.headline,
    article?.name,
    document.parsed.ogTitle,
    document.parsed.title,
  );
  const description = textValue(
    article?.description,
    document.parsed.description,
    document.parsed.ogDescription,
    title,
  );
  const date = parseDate(
    article?.datePublished
      || article?.dateCreated
      || document.parsed.publishedDate,
    `${document.relativeName} press-release metadata`,
  );
  if (!title) fail(`${document.relativeName}: press-release metadata has no title.`);
  if (!description) fail(`${document.relativeName}: press-release metadata has no description.`);
  if (!date) fail(`${document.relativeName}: press-release metadata has no datePublished or publication date meta tag.`);
  return {
    date,
    description,
    href: document.canonical.href,
    title,
  };
}

function escapeXml(value) {
  const source = String(value);
  for (const character of source) {
    const codePoint = character.codePointAt(0);
    if (codePoint < 0x20 && ![0x09, 0x0a, 0x0d].includes(codePoint)) {
      fail(`cannot emit XML containing control character U+${codePoint.toString(16).padStart(4, '0')}.`);
    }
  }
  return source
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function renderSitemap(documents) {
  const entries = documents
    .map((document) => document.canonical)
    .sort((a, b) => a.pathname.localeCompare(b.pathname) || a.href.localeCompare(b.href))
    .map(({ href }) => `  <url><loc>${escapeXml(href)}</loc></url>`)
    .join('\n');
  if (!entries) fail('no indexable canonical documents were found for sitemap.xml.');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>',
    '',
  ].join('\n');
}

function renderFeed(documents, origin) {
  const pressDocuments = documents.filter(({ canonical }) => {
    const detailPath = canonical.pathname.slice('/press-releases/'.length);
    return canonical.pathname.startsWith('/press-releases/') && detailPath && !detailPath.includes('/');
  });
  if (pressDocuments.length === 0) fail('no canonical press-release documents were found for feed.xml.');

  const entries = pressDocuments
    .map(extractFeedEntry)
    .sort((a, b) => b.date.getTime() - a.date.getTime() || a.href.localeCompare(b.href));
  const archive = documents.find(({ canonical }) => canonical.pathname === '/press-releases');
  const home = documents.find(({ canonical }) => canonical.pathname === '/');
  const siteName = textValue(home?.parsed.ogSiteName, archive?.parsed.ogSiteName, DEFAULT_SITE_NAME);
  const siteDescription = textValue(
    home?.parsed.description,
    archive?.parsed.description,
    home?.parsed.ogDescription,
    DEFAULT_SITE_DESCRIPTION,
  );
  const channelHref = archive?.canonical.href || new URL('/press-releases', `${origin}/`).toString();
  const selfHref = new URL('/feed.xml', `${origin}/`).toString();
  const items = entries.map((entry) => [
    '    <item>',
    `      <title>${escapeXml(entry.title)}</title>`,
    `      <link>${escapeXml(entry.href)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(entry.href)}</guid>`,
    `      <description>${escapeXml(entry.description)}</description>`,
    `      <pubDate>${escapeXml(entry.date.toUTCString())}</pubDate>`,
    '    </item>',
  ].join('\n')).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(siteName)} press releases</title>`,
    `    <link>${escapeXml(channelHref)}</link>`,
    `    <description>${escapeXml(siteDescription)}</description>`,
    `    <atom:link href="${escapeXml(selfHref)}" rel="self" type="application/rss+xml" />`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

async function findNotFoundDocument() {
  const nested = path.join(clientDirectory, '404', 'index.html');
  const flat = path.join(clientDirectory, '404.html');
  if (await fileExists(nested)) return nested;
  if (await fileExists(flat)) return flat;
  fail(`prerendered /404 document is missing; expected ${nested} or ${flat}.`);
}

async function main() {
  if (!(await directoryExists(clientDirectory))) {
    fail(`client output directory is missing: ${clientDirectory}. Run the framework build first.`);
  }

  const htmlFiles = await collectHtmlFiles(clientDirectory);
  if (htmlFiles.length === 0) fail(`no generated HTML documents found recursively under ${clientDirectory}.`);

  const parsedDocuments = [];
  for (const filePath of htmlFiles) {
    const relativeName = getRelativeName(filePath);
    const html = await readFileOrFail(filePath, relativeName);
    const parsed = scanHtml(html, relativeName);
    parsedDocuments.push({ filePath, html, parsed, relativeName, sourcePath: routePathFromFile(relativeName) });
  }

  const candidateDocuments = parsedDocuments.filter(({ relativeName, parsed }) => canonicalDocumentCandidate(relativeName, parsed));
  if (candidateDocuments.length === 0) fail('no indexable generated HTML documents with canonical routes were found.');

  const suppliedSiteUrl = textValue(process.env.SITE_URL, process.env.VITE_SITE_URL);
  let origin = suppliedSiteUrl ? validateOrigin(suppliedSiteUrl, 'SITE_URL') : '';
  if (!origin) {
    const discoveredOrigins = new Set();
    for (const document of candidateDocuments) {
      for (const rawCanonical of document.parsed.canonicalLinks) {
        const discovered = absoluteOriginFromCanonical(rawCanonical, document.sourcePath);
        if (discovered) discoveredOrigins.add(discovered);
      }
    }
    if (discoveredOrigins.size > 1) {
      fail(`canonical documents use multiple origins: ${[...discoveredOrigins].sort().join(', ')}`);
    }
    origin = [...discoveredOrigins][0] || '';
  }
  if (!origin) fail('unable to determine the canonical site origin; use absolute canonical links or set SITE_URL.');

  const canonicalDocuments = [];
  const seenCanonical = new Map();
  for (const document of candidateDocuments) {
    if (document.parsed.canonicalLinks.length === 0) {
      fail(`${document.relativeName}: indexable generated HTML is missing <link rel="canonical">.`);
    }
    if (document.parsed.canonicalLinks.length > 1) {
      fail(`${document.relativeName}: expected one canonical link, found ${document.parsed.canonicalLinks.length}.`);
    }

    const canonical = normaliseCanonical(
      document.parsed.canonicalLinks[0],
      origin,
      document.relativeName,
    );
    if (canonical.pathname === '/404' || canonical.pathname.includes('*')) continue;
    // A prerendered alias intentionally points at another route. Ignore it
    // before enforcing the site's origin, so an external redirect/canonical on
    // an alias cannot poison an otherwise valid sitemap.
    if (document.sourcePath !== canonical.pathname) continue;
    if (canonical.origin !== origin) {
      fail(`${document.relativeName}: canonical origin ${canonical.origin} does not match the site origin ${origin}.`);
    }

    document.canonical = canonical;
    const duplicate = seenCanonical.get(canonical.href);
    if (duplicate) continue;
    seenCanonical.set(canonical.href, document);
    canonicalDocuments.push(document);
  }

  if (canonicalDocuments.length === 0) fail('all canonical documents were aliases, fallbacks, 404 output, or duplicates.');

  const notFoundDocument = await findNotFoundDocument();
  const notFoundHtml = await readBufferOrFail(notFoundDocument, getRelativeName(notFoundDocument));
  const sitemap = renderSitemap(canonicalDocuments);
  const feed = renderFeed(canonicalDocuments, origin);

  await writeFile(path.join(clientDirectory, 'sitemap.xml'), sitemap, 'utf8');
  await writeFile(path.join(clientDirectory, 'feed.xml'), feed, 'utf8');
  await writeFile(path.join(clientDirectory, '404.html'), notFoundHtml);

  console.log(`Generated sitemap.xml (${canonicalDocuments.length} URL${canonicalDocuments.length === 1 ? '' : 's'}), feed.xml, and 404.html under ${clientDirectory}.`);
}

await main();

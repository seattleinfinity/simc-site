import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDirectory, '..');
const clientDirectory = path.resolve(
  process.env.SEO_CLIENT_DIR || path.join(projectRoot, 'dist', 'client'),
);

const DEFAULT_SITE_NAME = 'Seattle Infinity Math Circle';
const DEFAULT_SITE_DESCRIPTION = 'Seattle Infinity Math Circle inspires students across the Seattle area to explore mathematics through competitions, events, and community.';
const FALLBACK_DOCUMENT_NAMES = new Set(['__spa-fallback.html', '__spa-fallback.htm']);
const REDIRECT_MANIFEST_PATH = path.join(projectRoot, 'redirects.json');

const fail = (message) => {
  throw new Error(`[generate-seo-assets] ${message}`);
};

async function readRedirectManifest() {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(REDIRECT_MANIFEST_PATH, 'utf8'));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    fail(`redirect manifest is not valid JSON: ${detail}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    fail('redirect manifest must contain an object of source paths to destinations.');
  }

  for (const [source, destination] of Object.entries(parsed)) {
    if (!source.startsWith('/') || !destination.startsWith('/')) {
      fail(`redirects must use absolute paths: ${source} -> ${destination}`);
    }
  }

  return parsed;
}

const renderRedirects = (redirects) => [
  '# Generated from redirects.json. Do not edit this build artifact directly.',
  ...Object.entries(redirects)
    .sort(([sourceA], [sourceB]) => sourceA.localeCompare(sourceB))
    .map(([source, destination]) => `${source} ${destination} 301`),
  '',
].join('\n');

const textValue = (...values) => values.find((value) => typeof value === 'string' && value.trim())?.trim() || '';

function scanHtml(source, relativeName) {
  let document;
  try {
    document = new JSDOM(source).window.document;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    fail(relativeName + ': unable to parse HTML (' + detail + ').');
  }

  const metadataRoot = /<head\b/iu.test(source) ? document.head : document;
  const getAttribute = (element, name) => element?.getAttribute(name)?.trim() || '';
  const metaTags = Array.from(metadataRoot.querySelectorAll('meta'));
  const canonicalLinks = Array.from(metadataRoot.querySelectorAll('link'))
    .filter((element) => getAttribute(element, 'rel').split(/\s+/u)
      .some((value) => value.toLowerCase() === 'canonical'))
    .map((element) => getAttribute(element, 'href'));
  const jsonLdScripts = Array.from(metadataRoot.querySelectorAll('script'))
    .filter((element) => getAttribute(element, 'type').split(';', 1)[0].toLowerCase() === 'application/ld+json')
    .map((element, index) => {
      const text = (element.textContent || '').trim();
      if (!text) fail(relativeName + ': JSON-LD script #' + (index + 1) + ' is empty.');
      try {
        return JSON.parse(text);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        fail(relativeName + ': JSON-LD script #' + (index + 1) + ' is invalid JSON (' + detail + ').');
      }
    });

  const firstMeta = (attributeName, attributeValue) => metaTags.find((element) => (
    getAttribute(element, attributeName).toLowerCase() === attributeValue.toLowerCase()
  ));
  const contentForMeta = (...queries) => {
    for (const [attributeName, attributeValue] of queries) {
      const element = firstMeta(attributeName, attributeValue);
      const content = element ? getAttribute(element, 'content') : '';
      if (content) return content;
    }
    return '';
  };

  const title = (metadataRoot.querySelector('title')?.textContent || '').replace(/\s+/gu, ' ').trim();
  const robotsValues = metaTags
    .filter((element) => ['robots', 'googlebot', 'bingbot'].includes(getAttribute(element, 'name').toLowerCase()))
    .map((element) => getAttribute(element, 'content'));
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

  const redirects = await readRedirectManifest();

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
  await writeFile(path.join(clientDirectory, '_redirects'), renderRedirects(redirects), 'utf8');

  console.log(`Generated sitemap.xml (${canonicalDocuments.length} URL${canonicalDocuments.length === 1 ? '' : 's'}), feed.xml, 404.html, and _redirects under ${clientDirectory}.`);
}

await main();

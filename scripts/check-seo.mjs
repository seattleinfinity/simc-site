import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { parse as parseYaml } from 'yaml';
import { PERMANENT_REDIRECTS as EXPECTED_REDIRECTS } from '../worker/index.js';

const SCRIPT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_ROOT = process.env.SEO_CHECK_ROOT
  ? resolve(process.env.SEO_CHECK_ROOT)
  : SCRIPT_ROOT;
const DIST_ROOT = join(PROJECT_ROOT, 'dist');
const CLIENT_ROOT = join(DIST_ROOT, 'client');
const ORIGIN = 'https://seattleinfinity.org';
const SITEMAP_URL = `${ORIGIN}/sitemap.xml`;

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

function frontMatterValue(source, key, scope) {
  if (!source.startsWith('---')) return '';
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(source);
  if (!match) return '';

  let data;
  try {
    data = parseYaml(match[1]);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    addError(scope, 'invalid YAML front matter: ' + detail);
    return '';
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    addError(scope, 'front matter must be a YAML mapping');
    return '';
  }
  return data[key];
}

function splitFrontMatterList(value) {
  const values = Array.isArray(value) ? value : [value];
  return values
    .filter((entry) => typeof entry === 'string')
    .flatMap((entry) => entry.split(/\s*;\s*/u).filter(Boolean));
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

function parseHtml(source, scope) {
  try {
    return new JSDOM(source).window.document;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    addError(scope, 'unable to parse HTML: ' + detail);
    return null;
  }
}

function parseXml(source, scope) {
  try {
    const document = new JSDOM(source, { contentType: 'text/xml' }).window.document;
    const parserError = document.getElementsByTagName('parsererror')[0];
    if (parserError) {
      addError(scope, 'invalid XML: ' + normalizeText(parserError.textContent || ''));
      return null;
    }
    return document;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    addError(scope, 'unable to parse XML: ' + detail);
    return null;
  }
}

function firstAttribute(element, name) {
  return element?.getAttribute(name)?.trim() || '';
}

function allAttributes(element, name) {
  return Array.from(element?.attributes || [])
    .filter((attribute) => attribute.name.toLowerCase() === name.toLowerCase())
    .map((attribute) => attribute.value);
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/gu, ' ').trim();
}

function meaningfulText(element) {
  if (!element) return '';
  const clone = element.cloneNode(true);
  clone.querySelectorAll('script, style').forEach((node) => node.remove());
  return normalizeText(clone.textContent);
}

function hasMeaningfulRootContent(element) {
  if (meaningfulText(element)) return true;
  return Boolean(element?.querySelector('img, svg, canvas, iframe, form, table, video, audio'));
}

function countLiteral(source, expression) {
  return Array.from(source.matchAll(expression)).length;
}

function metaValue(document, matcher, scope, label) {
  const matches = Array.from(document.querySelectorAll('meta')).filter((element) => [
    ...allAttributes(element, 'name'),
    ...allAttributes(element, 'property'),
  ].some((identity) => identity.toLowerCase() === matcher));

  if (matches.length !== 1) {
    addError(scope, label + ' must appear exactly once (found ' + matches.length + ')');
    return null;
  }

  const value = firstAttribute(matches[0], 'content');
  if (!value) addError(scope, label + ' must have non-empty content');
  return value || null;
}

function linkCanonicalValue(document, scope) {
  const matches = Array.from(document.querySelectorAll('link')).filter((element) => firstAttribute(element, 'rel')
    .split(/\s+/u).some((value) => value.toLowerCase() === 'canonical'));

  if (matches.length !== 1) {
    addError(scope, 'canonical link must appear exactly once (found ' + matches.length + ')');
    return null;
  }

  const value = firstAttribute(matches[0], 'href');
  if (!value) addError(scope, 'canonical link must have a non-empty href');
  return value || null;
}

function validateJsonLd(html, document, scope, { required = true } = {}) {
  const scripts = Array.from(document.querySelectorAll('script'));
  const closeCount = countLiteral(html, /<\/script\b/giu);
  if (closeCount > scripts.length) {
    addError(scope, 'found ' + (closeCount - scripts.length) + ' unexpected literal </script> sequence(s); JSON-LD may be leaking an unescaped script terminator');
  }

  const jsonLdScripts = scripts.filter((element) => firstAttribute(element, 'type')
    .split(';', 1)[0].trim().toLowerCase() === 'application/ld+json');
  if (jsonLdScripts.length === 0) {
    if (required) addError(scope, 'at least one application/ld+json script is required');
    return;
  }

  jsonLdScripts.forEach((script, index) => {
    const scriptScope = scope + ' JSON-LD #' + (index + 1);
    const rawJson = (script.textContent || '').trim();
    if (!rawJson) {
      addError(scriptScope, 'script content must be non-empty JSON');
      return;
    }

    let value;
    try {
      value = JSON.parse(rawJson);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      addError(scriptScope, 'content is not valid JSON (' + detail + '); escape any </script> inside JSON strings');
      return;
    }

    const contexts = [];
    const nodes = [];
    collectJsonLd(value, contexts, nodes);
    if (!contexts.includes('https://schema.org')) addError(scriptScope, 'JSON-LD must declare the https://schema.org context');

    const typedNode = nodes.find((node) => {
      const type = node['@type'];
      return (typeof type === 'string' && type.trim())
        || (Array.isArray(type) && type.some((entry) => typeof entry === 'string' && entry.trim()));
    });
    if (!typedNode) addError(scriptScope, 'JSON-LD must contain at least one typed schema.org object');
    counts.jsonLdScripts += 1;
  });
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
    if (Array.isArray(context)) context.forEach((entry) => {
      if (typeof entry === 'string') contexts.push(entry);
    });
  }
  nodes.push(value);
  if (value['@graph'] !== undefined) collectJsonLd(value['@graph'], contexts, nodes);
}

function xmlElementText(element) {
  return normalizeText(element?.textContent || '');
}

function localXmlName(element) {
  const name = typeof element === 'string' ? element : element?.localName || element?.nodeName || '';
  return name.toLowerCase().split(':').at(-1);
}

function parseSitemap(source, sitemapPath) {
  if (!source.trim()) {
    addError(sitemapLabel, 'file is empty');
    return [];
  }

  const document = parseXml(source, sitemapLabel);
  if (!document) return [];

  const root = document.documentElement;
  if (!root) {
    addError(sitemapLabel, 'expected exactly one XML root element (found 0)');
    return [];
  }

  if (localXmlName(root) !== 'urlset') {
    addError(sitemapLabel, 'root element must be <urlset> (found <' + root.nodeName + '>)');
    return [];
  }

  const namespace = root.getAttribute('xmlns') || '';
  if (namespace !== 'http://www.sitemaps.org/schemas/sitemap/0.9') {
    addError(sitemapLabel, 'root <urlset> must declare the sitemap 0.9 namespace');
  }

  const urls = Array.from(root.children).filter((element) => localXmlName(element) === 'url');
  if (urls.length === 0) addError(sitemapLabel, 'sitemap must contain at least one <url> entry');

  const entries = [];
  const seenLocs = new Map();
  const seenPaths = new Map();

  urls.forEach((urlElement, index) => {
    const scope = sitemapLabel + ' url #' + (index + 1);
    const locs = Array.from(urlElement.children).filter((element) => localXmlName(element) === 'loc');
    if (locs.length !== 1) {
      addError(scope, '<url> must contain exactly one <loc> (found ' + locs.length + ')');
      return;
    }

    const loc = xmlElementText(locs[0]);
    if (!loc) {
      addError(scope, '<loc> must be non-empty');
      return;
    }

    let parsed;
    try {
      parsed = new URL(loc);
    } catch {
      addError(scope, '<loc> is not a valid absolute URL: ' + loc);
      return;
    }

    if (parsed.protocol !== 'https:') addError(scope, 'URL must use https: ' + loc);
    if (parsed.origin !== ORIGIN) addError(scope, 'URL must use the canonical origin ' + ORIGIN + ': ' + loc);
    if (parsed.search || parsed.hash) addError(scope, 'URL must not contain a query string or fragment');
    if (parsed.username || parsed.password || parsed.port) addError(scope, 'URL must not contain credentials or a port');

    let decodedPath;
    try {
      decodedPath = decodeURIComponent(parsed.pathname);
    } catch {
      addError(scope, 'pathname contains malformed percent encoding: ' + parsed.pathname);
      return;
    }
    if (decodedPath.includes('\\') || decodedPath.includes('\0') || decodedPath.split('/').some((part) => part === '..')) {
      addError(scope, 'pathname is not a safe route path: ' + parsed.pathname);
    }
    if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
      addError(scope, 'canonical route paths must not have a trailing slash');
    }
    if (/%2f|%5c/iu.test(parsed.pathname)) addError(scope, 'encoded slashes are not valid route paths');

    const path = parsed.pathname;
    if (KNOWN_ALIASES.has(path)) {
      addError(scope, 'known route alias is not allowed in the sitemap: ' + path);
    }

    const previousLoc = seenLocs.get(loc);
    if (previousLoc) addError(scope, 'duplicate canonical URL (also listed at sitemap entry #' + previousLoc + ')');
    else seenLocs.set(loc, index + 1);

    const previousPath = seenPaths.get(path);
    if (previousPath) addError(scope, 'duplicate canonical pathname (also listed at sitemap entry #' + previousPath + ')');
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
  // React Router prerenders the canonical SEO_ROUTES registry. Treat these
  // generated documents as the expected route set instead of duplicating that
  // registry in this Node-only checker.
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

function validateDevelopmentAssetUrls(document, html, scope) {
  const urlAttributes = new Set(['src', 'href', 'srcset', 'action', 'poster', 'content']);
  Array.from(document.querySelectorAll('*')).forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      if (urlAttributes.has(attribute.name) && /(?:\/src\/|\/@fs(?:\/|$))/iu.test(attribute.value)) {
        addError(scope, 'development asset URL is not allowed: ' + attribute.value);
      }
    });
  });
  if (/<(?:script|link)\b[^>]*(?:\/src\/|\/@fs(?:\/|["']))/iu.test(html)) {
    addError(scope, 'development /src/ or /@fs/ asset URL detected in rendered HTML');
  }
}

function validateSpaFallback() {
  const pathname = join(CLIENT_ROOT, '__spa-fallback.html');
  if (!isFile(pathname)) return;

  const scope = outputLabel('__spa-fallback.html');
  const html = readText(pathname, scope);
  if (html === null) return;

  const document = parseHtml(html, scope);
  if (!document) return;

  const canonicalLinks = Array.from(document.querySelectorAll('link')).filter((element) => firstAttribute(element, 'rel')
    .split(/\s+/u).some((value) => value.toLowerCase() === 'canonical'));
  if (canonicalLinks.length > 0) addError(scope, 'generic SPA fallback must not contain a canonical link');

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
  Array.from(document.querySelectorAll('meta')).forEach((element) => {
    const identities = [
      ...allAttributes(element, 'name'),
      ...allAttributes(element, 'property'),
    ].map((value) => value.toLowerCase());
    const content = firstAttribute(element, 'content');
    identities.forEach((identity) => {
      if (routeSpecificMeta.has(identity)) {
        addError(scope, 'generic SPA fallback must not contain route-specific ' + identity + ' metadata');
      }
      if (['robots', 'googlebot', 'bingbot'].includes(identity)) {
        const directives = content.toLowerCase().split(/[,\s]+/u).filter(Boolean);
        if (!directives.includes('noindex') && !directives.includes('none')) {
          addError(scope, 'generic SPA fallback ' + identity + ' metadata must not allow indexing (found: ' + content + ')');
        }
      }
    });
  });

  const jsonLdScripts = Array.from(document.querySelectorAll('script')).filter((element) => firstAttribute(element, 'type')
    .split(';', 1)[0].trim().toLowerCase() === 'application/ld+json');
  if (jsonLdScripts.length > 0) addError(scope, 'generic SPA fallback must not contain route-specific JSON-LD');

  const body = document.querySelector('body');
  if (!body || !/<body\b/iu.test(html)) {
    addError(scope, 'generic SPA fallback must contain a <body> element');
    return;
  }
  if (hasMeaningfulRootContent(body)) addError(scope, 'generic SPA fallback must not contain prerendered route content');
}

function validateHtmlPage(entry, htmlPath, html) {
  const scope = outputLabel(outputRelative(htmlPath));
  const document = parseHtml(html, scope);
  if (!document) return;

  const rootElements = Array.from(document.querySelectorAll('[id]')).filter((element) => (
    firstAttribute(element, 'id').toLowerCase() === 'root'
  ));
  if (rootElements.length > 1) {
    addError(scope, 'prerendered #root element must appear at most once (found ' + rootElements.length + ')');
  } else if (rootElements.length === 1 && !hasMeaningfulRootContent(rootElements[0])) {
    addError(scope, 'prerendered #root content must be non-empty');
  }

  const titleElements = Array.from(document.querySelectorAll('title'));
  let title = null;
  if (titleElements.length !== 1) {
    addError(scope, 'title element must appear exactly once (found ' + titleElements.length + ')');
  } else {
    title = normalizeText(titleElements[0].textContent);
    if (!title) addError(scope, 'title element must contain meaningful text');
  }

  const description = metaValue(document, 'description', scope, 'meta description');
  const robots = metaValue(document, 'robots', scope, 'robots meta');
  if (robots) {
    const directives = robots.toLowerCase().split(/[,\s]+/u).filter(Boolean);
    if (directives.includes('noindex') || directives.includes('none')) {
      addError(scope, 'robots meta must allow indexing (found: ' + robots + ')');
    }
  }

  const canonical = linkCanonicalValue(document, scope);
  const openGraph = {
    title: metaValue(document, 'og:title', scope, 'og:title meta'),
    description: metaValue(document, 'og:description', scope, 'og:description meta'),
    url: metaValue(document, 'og:url', scope, 'og:url meta'),
    type: metaValue(document, 'og:type', scope, 'og:type meta'),
  };
  const twitter = {
    title: metaValue(document, 'twitter:title', scope, 'twitter:title meta'),
    description: metaValue(document, 'twitter:description', scope, 'twitter:description meta'),
    card: metaValue(document, 'twitter:card', scope, 'twitter:card meta'),
  };

  const body = document.querySelector('body');
  if (!body || !/<body\b/iu.test(html)) {
    addError(scope, 'rendered body must contain a <body> element');
  } else if (!hasMeaningfulRootContent(body)) {
    addError(scope, 'rendered body content must be non-empty');
  }
  const bodyH1Count = body ? body.querySelectorAll('h1').length : 0;
  if (bodyH1Count < 1) addError(scope, 'rendered body must contain at least one <h1>');

  validateDevelopmentAssetUrls(document, html, scope);
  validateJsonLd(html, document, scope);

  if (canonical && canonical !== entry.loc) addError(scope, 'canonical URL must exactly equal sitemap URL ' + entry.loc + ' (found ' + canonical + ')');
  if (canonical) {
    try {
      const canonicalUrl = new URL(canonical);
      if (canonicalUrl.pathname !== entry.pathname || canonicalUrl.search || canonicalUrl.hash) {
        addError(scope, 'canonical URL pathname must exactly match sitemap pathname ' + entry.pathname + ' (found ' + canonical + ')');
      }
    } catch {
      addError(scope, 'canonical link must be an absolute URL (found ' + canonical + ')');
    }
  }
  if (openGraph.url && openGraph.url !== entry.loc) {
    addError(scope, 'og:url must exactly equal sitemap URL ' + entry.loc + ' (found ' + openGraph.url + ')');
  }
  if (openGraph.url) {
    try {
      const openGraphUrl = new URL(openGraph.url);
      if (openGraphUrl.pathname !== entry.pathname || openGraphUrl.search || openGraphUrl.hash) {
        addError(scope, 'og:url pathname must exactly match sitemap pathname ' + entry.pathname + ' (found ' + openGraph.url + ')');
      }
    } catch {
      addError(scope, 'og:url must be an absolute URL (found ' + openGraph.url + ')');
    }
  }

  if (title) entry.title = title;
  if (description) entry.description = normalizeText(description);
  if (canonical) entry.canonical = canonical;
  counts.htmlPages += 1;
}

function validateNotFoundPage(htmlPath, html) {
  const scope = outputLabel(outputRelative(htmlPath));
  const document = parseHtml(html, scope);
  if (!document) return;

  const rootElements = Array.from(document.querySelectorAll('[id]')).filter((element) => (
    firstAttribute(element, 'id').toLowerCase() === 'root'
  ));
  if (rootElements.length > 1) {
    addError(scope, '404 #root element must appear at most once (found ' + rootElements.length + ')');
  } else if (rootElements.length === 1 && !hasMeaningfulRootContent(rootElements[0])) {
    addError(scope, '404 #root content must be non-empty and rendered');
  }

  const titleElements = Array.from(document.querySelectorAll('title'));
  let title = '';
  if (titleElements.length !== 1) {
    addError(scope, 'title element must appear exactly once (found ' + titleElements.length + ')');
  } else {
    title = normalizeText(titleElements[0].textContent);
    if (!title) addError(scope, 'title element must contain meaningful text');
  }

  metaValue(document, 'description', scope, 'meta description');
  const robots = metaValue(document, 'robots', scope, 'robots meta');
  if (robots) {
    const directives = robots.toLowerCase().split(/[,\s]+/u).filter(Boolean);
    if (!directives.includes('noindex') && !directives.includes('none')) {
      addError(scope, '404 robots meta must include noindex (found: ' + robots + ')');
    }
  }

  metaValue(document, 'og:title', scope, 'og:title meta');
  metaValue(document, 'og:description', scope, 'og:description meta');
  metaValue(document, 'og:type', scope, 'og:type meta');
  metaValue(document, 'twitter:title', scope, 'twitter:title meta');
  metaValue(document, 'twitter:description', scope, 'twitter:description meta');
  metaValue(document, 'twitter:card', scope, 'twitter:card meta');

  const body = document.querySelector('body');
  if (!body || !/<body\b/iu.test(html)) {
    addError(scope, '404 response must contain a <body> element');
  } else if (!hasMeaningfulRootContent(body)) {
    addError(scope, '404 rendered body content must be non-empty');
  }

  const h1Count = body ? body.querySelectorAll('h1').length : 0;
  if (h1Count < 1) addError(scope, '404 rendered body must contain at least one <h1>');

  const bodyText = body ? meaningfulText(body) : '';
  if (!/(?:\b404\b|not\s+found|page\s+(?:is\s+)?missing|couldn['’]?t\s+find)/iu.test(bodyText)) {
    addError(scope, '404 rendered body must contain real missing-page content');
  }

  validateDevelopmentAssetUrls(document, html, scope);
  validateJsonLd(html, document, scope, { required: false });
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

function validateGeneratedRouteSet(entries, routeOutputs) {
  const generatedPageCount = routeOutputs.size;
  if (entries.length !== generatedPageCount) {
    addError(sitemapLabel, `sitemap must contain one URL per generated canonical route (found ${entries.length}; generated ${generatedPageCount})`);
  }
  if (!routeOutputs.has('/')) addError(sitemapLabel, 'generated canonical route output is missing the site root');
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
      const aliases = splitFrontMatterList(frontMatterValue(source, 'aliases', scope));
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

function parseFeedUrl(value) {
  const text = String(value || '').trim();
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
    addError(outputLabel('feed.xml'), 'generated XML feed is required (expected feed.xml, rss.xml, atom.xml, press-releases.xml, or an equivalent feed file)');
    return;
  }

  const feedScope = outputLabel(feed.relativeName);
  const source = readText(feed.path, feedScope);
  if (source === null || !source.trim()) {
    addError(feedScope, 'feed is empty');
    return;
  }

  const document = parseXml(source, feedScope);
  if (!document) return;

  const root = document.documentElement;
  if (!root) {
    addError(feedScope, 'expected exactly one XML feed root (found 0)');
    return;
  }

  const rootName = localXmlName(root);
  if (rootName !== 'rss' && rootName !== 'feed') {
    addError(feedScope, 'root element must be <rss> or <feed> (found <' + root.nodeName + '>)');
    return;
  }

  const canonicalPressUrls = new Set(entries
    .filter((entry) => entry.pathname.startsWith('/press-releases/'))
    .map((entry) => entry.loc));
  const itemElements = Array.from(root.getElementsByTagName('*'))
    .filter((element) => ['item', 'entry'].includes(localXmlName(element)));
  if (itemElements.length === 0) addError(feedScope, 'feed must contain at least one RSS <item> or Atom <entry>');

  let matchingItems = 0;
  itemElements.forEach((item, index) => {
    const scope = feedScope + ' entry #' + (index + 1);
    const descendants = Array.from(item.getElementsByTagName('*'));
    const urlCandidates = [];
    descendants.forEach((element) => {
      if (!['link', 'guid', 'id'].includes(localXmlName(element))) return;
      const href = firstAttribute(element, 'href');
      const value = href || xmlElementText(element);
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
        addError(scope, 'press-release URL must exactly match a canonical sitemap URL: ' + url);
      }
    });

    const dateValues = descendants
      .filter((element) => ['pubdate', 'published', 'updated', 'date'].includes(localXmlName(element)))
      .map((element) => xmlElementText(element))
      .filter(Boolean);
    const hasParseableDate = dateValues.some((value) => !Number.isNaN(Date.parse(value)));
    if (!hasParseableDate) addError(scope, 'canonical press-release entry must contain a parseable publication date');
  });

  counts.feedEntries = matchingItems;
  if (matchingItems === 0) addError(feedScope, 'feed must contain at least one canonical press-release URL');
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
    validateGeneratedRouteSet(entries, discovered.routeOutputs);
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

import { build as viteBuild } from 'vite';
import { JSDOM } from 'jsdom';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDirectory, '..');
const distDirectory = path.join(projectRoot, 'dist');
const serverBuildDirectory = path.join(projectRoot, '.server-build');
const serverEntrySource = path.join(projectRoot, 'src/entry-server.tsx');
const serverEntryOutput = path.join(serverBuildDirectory, 'entry-server.js');
const templatePath = path.join(distDirectory, 'index.html');
const siteFallbackName = 'Seattle Infinity Math Circle';
const siteFallbackDescription = 'Seattle Infinity Math Circle inspires students across the Seattle area to explore mathematics through competitions, events, and community.';

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const textValue = (...values) => values.find((value) => typeof value === 'string' && value.trim())?.trim() || '';

const objectValue = (...values) => values.find((value) => isRecord(value)) || {};

const routePath = (route) => {
  if (typeof route === 'string') return route;
  if (!isRecord(route)) return '';
  return textValue(route.pathname, route.path, route.url);
};

const normalizePathname = (pathname, label = 'route') => {
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) {
    throw new Error(`${label} must be an absolute pathname beginning with '/'. Received: ${String(pathname)}`);
  }
  if (pathname !== '/' && pathname.endsWith('/')) {
    throw new Error(`${label} must not have a trailing slash. Received: ${pathname}`);
  }
  if (pathname.includes('?') || pathname.includes('#') || pathname.includes('//') || pathname.includes('\\') || /%2f|%5c|%00/iu.test(pathname)) {
    throw new Error(`${label} must not contain a query, hash, repeated slash, backslash, or encoded delimiter. Received: ${pathname}`);
  }
  const segments = pathname.split('/');
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error(`${label} must not contain dot segments. Received: ${pathname}`);
  }
  return pathname;
};

const outputFileForPath = (pathname) => pathname === '/'
  ? 'index.html'
  : `${pathname.slice(1)}.html`;

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const escapeXml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const escapeJsonForHtml = (value) => {
  const json = JSON.stringify(value);
  if (!json) throw new Error('Structured data must be JSON serializable.');
  return json.replace(/[<>&\u2028\u2029]/g, (character) => ({
    '<': '\\u003c',
    '>': '\\u003e',
    '&': '\\u0026',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029',
  }[character]));
};

const removeHeadTags = (html) => html
  .replace(/\s*<!--\s*seo:managed:start\s*-->[\s\S]*?<!--\s*seo:managed:end\s*-->/gi, '')
  .replace(/\s*<title\b[^>]*>[\s\S]*?<\/title\s*>/gi, '')
  .replace(/\s*<meta\b(?=[^>]*\bname\s*=\s*["'](?:description|robots|googlebot|author|twitter:[^"']+)["'])[^>]*\/?>/gi, '')
  .replace(/\s*<meta\b(?=[^>]*\bproperty\s*=\s*["']og:[^"']+["'])[^>]*\/?>/gi, '')
  .replace(/\s*<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*\/?>/gi, '')
  .replace(/\s*<script\b(?=[^>]*\btype\s*=\s*["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script\s*>/gi, '');

const absoluteUrl = (siteUrl, value) => {
  const raw = textValue(value);
  if (!raw) return '';
  try {
    const url = new URL(raw, `${siteUrl}/`);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
};

const normalizeSiteUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error('SITE_URL is missing.');
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`SITE_URL is not a valid URL: ${value}`);
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error(`SITE_URL must be an HTTPS origin without credentials, query, or hash: ${value}`);
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    throw new Error(`SITE_URL must not include a path: ${value}`);
  }
  return url.origin;
};

const getNestedUrl = (value) => {
  if (typeof value === 'string') return value;
  if (isRecord(value)) return textValue(value.url, value.href, value.src);
  return '';
};

const structuredDataHasSchemaNode = (value) => {
  if (Array.isArray(value)) return value.some(structuredDataHasSchemaNode);
  if (!isRecord(value)) return false;
  const context = value['@context'];
  const type = value['@type'];
  const hasContext = context === 'https://schema.org'
    || (Array.isArray(context) && context.includes('https://schema.org'));
  const hasType = (typeof type === 'string' && type.trim())
    || (Array.isArray(type) && type.some((entry) => typeof entry === 'string' && entry.trim()));
  return Boolean((hasContext && hasType) || structuredDataHasSchemaNode(value['@graph']));
};

const getMetadata = (server, siteUrl, pathname, { notFound = false } = {}) => {
  let data;
  try {
    data = server.getSeoData(pathname);
  } catch (error) {
    if (!notFound) throw new Error(`getSeoData(${pathname}) failed: ${error instanceof Error ? error.message : String(error)}`);
    data = {};
  }
  if (!isRecord(data)) {
    throw new Error(`getSeoData(${pathname}) must return an object.`);
  }

  const openGraph = objectValue(data.openGraph, data.open_graph, data.og);
  const twitter = objectValue(data.twitter, data.twitterCard);
  const title = textValue(data.title, data.metaTitle, data.seoTitle, openGraph.title, twitter.title)
    || (notFound ? 'Page not found | Seattle Infinity Math Circle' : '');
  const description = textValue(data.description, data.metaDescription, data.seoDescription, openGraph.description, twitter.description)
    || (notFound ? "We couldn't find the page you requested." : '');
  if (!title || !description) {
    throw new Error(`SEO metadata for ${pathname} must include a non-empty title and description.`);
  }

  const explicitCanonical = textValue(
    data.canonicalUrl,
    data.canonicalURL,
    data.canonical,
    data.url,
    openGraph.url,
  );
  const canonical = explicitCanonical ? absoluteUrl(siteUrl, explicitCanonical) : absoluteUrl(siteUrl, pathname);
  if (!notFound && !canonical) throw new Error(`SEO metadata for ${pathname} has an invalid canonical URL.`);
  if (!notFound) {
    const canonicalUrl = new URL(canonical);
    const expectedUrl = new URL(pathname, `${siteUrl}/`);
    if (canonicalUrl.origin !== expectedUrl.origin || canonicalUrl.pathname !== expectedUrl.pathname || canonicalUrl.search || canonicalUrl.hash) {
      throw new Error(`SEO metadata for ${pathname} has a canonical URL that does not match the route: ${canonical}`);
    }
  }

  const image = absoluteUrl(siteUrl, getNestedUrl(
    data.image,
    data.imageUrl,
    data.ogImage,
    data.ogImageUrl,
    openGraph.image,
    openGraph.imageUrl,
    twitter.image,
    twitter.imageUrl,
  ));
  const structuredDataValue = data.structuredData ?? data.jsonLd ?? data.jsonLD ?? data.schema ?? data.schemaData;
  let structuredData = structuredDataValue;
  if (typeof structuredData === 'string') {
    try {
      structuredData = JSON.parse(structuredData);
    } catch {
      throw new Error(`SEO metadata for ${pathname} has invalid JSON-LD.`);
    }
  }
  if (!notFound && (structuredData === undefined || structuredData === null || (!isRecord(structuredData) && !Array.isArray(structuredData)))) {
    throw new Error(`SEO metadata for ${pathname} must include structured data.`);
  }
  if (!notFound && !structuredDataHasSchemaNode(structuredData)) {
    throw new Error(`SEO metadata for ${pathname} must include a typed https://schema.org JSON-LD node.`);
  }

  const noIndex = notFound || data.noIndex === true || data.indexable === false;
  const robots = notFound ? 'noindex, nofollow' : textValue(data.robots, data.robotsContent) || (noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
  const ogType = textValue(data.ogType, data.openGraphType, openGraph.type) || 'website';
  const ogSiteName = textValue(data.siteName, data.ogSiteName, openGraph.siteName) || siteFallbackName;
  const ogLocale = textValue(data.locale, data.ogLocale, openGraph.locale) || 'en_US';
  const twitterCard = textValue(data.twitterCardType, twitter.card) || 'summary_large_image';

  return {
    title,
    description,
    canonical: noIndex ? '' : canonical,
    robots,
    noIndex,
    ogType,
    ogSiteName,
    ogLocale,
    image,
    twitterCard,
    structuredData,
  };
};

const renderHead = (metadata) => {
  const lines = [
    '    <!-- seo:managed:start -->',
    `    <title>${escapeHtml(metadata.title)}</title>`,
    `    <meta name="description" content="${escapeHtml(metadata.description)}" />`,
    `    <meta name="robots" content="${escapeHtml(metadata.robots)}" />`,
    `    <meta property="og:locale" content="${escapeHtml(metadata.ogLocale)}" />`,
    `    <meta property="og:site_name" content="${escapeHtml(metadata.ogSiteName)}" />`,
    `    <meta property="og:type" content="${escapeHtml(metadata.ogType)}" />`,
    `    <meta property="og:title" content="${escapeHtml(metadata.title)}" />`,
    `    <meta property="og:description" content="${escapeHtml(metadata.description)}" />`,
    `    <meta name="twitter:card" content="${escapeHtml(metadata.twitterCard)}" />`,
    `    <meta name="twitter:title" content="${escapeHtml(metadata.title)}" />`,
    `    <meta name="twitter:description" content="${escapeHtml(metadata.description)}" />`,
  ];
  if (metadata.image) {
    lines.push(`    <meta property="og:image" content="${escapeHtml(metadata.image)}" />`);
    lines.push(`    <meta name="twitter:image" content="${escapeHtml(metadata.image)}" />`);
  }
  if (metadata.canonical) {
    lines.push(`    <link rel="canonical" href="${escapeHtml(metadata.canonical)}" />`);
    lines.push(`    <meta property="og:url" content="${escapeHtml(metadata.canonical)}" />`);
  }
  if (metadata.structuredData !== undefined && metadata.structuredData !== null) {
    const records = Array.isArray(metadata.structuredData) ? metadata.structuredData : [metadata.structuredData];
    if (records.length > 0) {
    lines.push(`    <script id="site-structured-data" type="application/ld+json" data-simc-seo="structured-data">${escapeJsonForHtml(metadata.structuredData)}</script>`);
    }
  }
  lines.push('    <!-- seo:managed:end -->');
  return lines.join('\n');
};

const renderDocument = (template, pathname, appHtml, metadata) => {
  if (!appHtml || !appHtml.trim()) throw new Error(`Route ${pathname} rendered empty markup.`);
  if (/\/src\//.test(appHtml) || /(?:^|["'(])src\//.test(appHtml)) {
    throw new Error(`Route ${pathname} contains a development /src/ asset URL.`);
  }
  const cleanTemplate = removeHeadTags(template);
  const rootPattern = /<div\s+id=["']root["']\s*><\/div>/i;
  if (!rootPattern.test(cleanTemplate)) throw new Error('dist/index.html is missing an empty #root element.');
  const withApp = cleanTemplate.replace(rootPattern, `<div id="root">${appHtml}</div>`);
  const headClose = /<\/head\s*>/i;
  if (!headClose.test(withApp)) throw new Error('dist/index.html is missing a closing </head> tag.');
  return withApp.replace(headClose, `${renderHead(metadata)}\n  </head>`);
};

const getLastModified = (route) => {
  if (!isRecord(route)) return '';
  const supplied = route.lastmod ?? route.lastModified;
  if (supplied === undefined || supplied === null || supplied === '') return '';
  const value = supplied instanceof Date ? supplied.toISOString() : String(supplied).trim();
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error(`Invalid sitemap lastmod value for ${routePath(route)}: ${value}`);
  if (!/^\d{4}-\d{2}-\d{2}(?:T[^\s]+)?$/.test(value)) {
    throw new Error(`Sitemap lastmod must be an ISO date or date-time for ${routePath(route)}: ${value}`);
  }
  return value;
};

const parsePressDate = (record) => {
  const candidate = record?.dateValue instanceof Date ? record.dateValue : record?.date;
  const date = candidate instanceof Date ? candidate : new Date(String(candidate || ''));
  if (!Number.isFinite(date.getTime())) return null;
  return date;
};

const renderSitemap = (siteUrl, routes) => {
  const entries = routes.map(({ pathname, route }) => {
    const lastmod = getLastModified(route);
    const loc = new URL(pathname, `${siteUrl}/`).toString();
    return `  <url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ''}</url>`;
  }).join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>',
    '',
  ].join('\n');
};

const renderFeed = (siteUrl, pressContent, canonicalPaths) => {
  if (!Array.isArray(pressContent) || pressContent.length === 0) {
    throw new Error('PRESS_CONTENT must contain at least one press release for feed.xml.');
  }
  const records = [...pressContent]
    .map((record) => ({ record, date: parsePressDate(record) }))
    .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  const invalid = records.find(({ date }) => !date);
  if (invalid) throw new Error(`Press release ${invalid.record?.slug || '(unknown)'} has no valid date for feed.xml.`);
  const items = records.map(({ record, date }) => {
    const pathname = `/press-releases/${record.slug}`;
    if (!canonicalPaths.has(pathname)) {
      throw new Error(`Press release feed route is not in SEO_ROUTES: ${pathname}`);
    }
    const url = new URL(pathname, `${siteUrl}/`).toString();
    const description = textValue(record.description, record.blurb, record.title);
    return [
      '    <item>',
      `      <title>${escapeXml(record.title)}</title>`,
      `      <link>${escapeXml(url)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
      `      <description>${escapeXml(description)}</description>`,
      `      <pubDate>${escapeXml(date.toUTCString())}</pubDate>`,
      '    </item>',
    ].join('\n');
  }).join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(siteFallbackName)} press releases</title>`,
    `    <link>${escapeXml(new URL('/press-releases', `${siteUrl}/`).toString())}</link>`,
    `    <description>${escapeXml(siteFallbackDescription)}</description>`,
    `    <atom:link href="${escapeHtml(new URL('/feed.xml', `${siteUrl}/`).toString())}" rel="self" type="application/rss+xml" />`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
};

const installServerDom = () => {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
  const previous = new Map();
  for (const [key, value] of [['window', dom.window], ['document', dom.window.document], ['navigator', dom.window.navigator]]) {
    previous.set(key, Object.prototype.hasOwnProperty.call(globalThis, key) ? globalThis[key] : undefined);
    Object.defineProperty(globalThis, key, { configurable: true, enumerable: false, writable: true, value });
  }
  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) delete globalThis[key];
      else Object.defineProperty(globalThis, key, { configurable: true, enumerable: false, writable: true, value });
    }
    dom.window.close();
  };
};

await rm(serverBuildDirectory, { recursive: true, force: true });
let restoreServerDom;
try {
  await viteBuild({
    root: projectRoot,
    configFile: path.join(projectRoot, 'vite.config.ts'),
    build: {
      ssr: serverEntrySource,
      outDir: serverBuildDirectory,
      emptyOutDir: true,
      ssrEmitAssets: true,
      rollupOptions: {
        output: { entryFileNames: 'entry-server.js' },
      },
    },
  });

  const template = await readFile(templatePath, 'utf8');
  restoreServerDom = installServerDom();
  const server = await import(pathToFileURL(serverEntryOutput).href);
  const siteUrl = normalizeSiteUrl(server.SITE_URL);
  if (!Array.isArray(server.SEO_ROUTES) || server.SEO_ROUTES.length === 0) {
    throw new Error('SEO_ROUTES must be a non-empty array.');
  }
  const routes = server.SEO_ROUTES.map((route, index) => {
    const pathname = normalizePathname(routePath(route), `SEO_ROUTES[${index}]`);
    return { pathname, route };
  });
  const seen = new Set();
  for (const { pathname } of routes) {
    if (seen.has(pathname)) throw new Error(`SEO_ROUTES contains duplicate pathname: ${pathname}`);
    seen.add(pathname);
  }

  for (const { pathname } of routes) {
    const metadata = getMetadata(server, siteUrl, pathname);
    let appHtml;
    try {
      appHtml = await server.render(pathname);
    } catch (error) {
      throw new Error(`Rendering route ${pathname} failed: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
    if (appHtml.includes('That page is missing.')) {
      throw new Error(`Rendering route ${pathname} returned the NotFoundPage.`);
    }
    const outputPath = path.join(distDirectory, outputFileForPath(pathname));
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, renderDocument(template, pathname, appHtml, metadata), 'utf8');
  }

  const notFoundMetadata = getMetadata(server, siteUrl, '/404', { notFound: true });
  let notFoundHtml;
  try {
    notFoundHtml = await server.render('/404');
  } catch (error) {
    throw new Error(`Rendering route /404 failed: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
  await writeFile(path.join(distDirectory, '404.html'), renderDocument(template, '/404', notFoundHtml, notFoundMetadata), 'utf8');
  await writeFile(path.join(distDirectory, 'sitemap.xml'), renderSitemap(siteUrl, routes), 'utf8');
  await writeFile(path.join(distDirectory, 'feed.xml'), renderFeed(siteUrl, server.PRESS_CONTENT, new Set(routes.map(({ pathname }) => pathname))), 'utf8');
  console.log(`Prerendered ${routes.length} canonical routes plus 404.html, sitemap.xml, and feed.xml.`);
} finally {
  restoreServerDom?.();
  await rm(serverBuildDirectory, { recursive: true, force: true });
}

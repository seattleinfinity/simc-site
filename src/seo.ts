import {
  EVENT_CONTENT,
  PAST_TEST_CONTENT,
  PRESS_CONTENT,
  type ContentRecord,
} from './content';
import { getRedirectTarget } from './redirects';

export const SITE_URL = 'https://seattleinfinity.org';

const SITE_NAME = 'Seattle Infinity Math Circle';
const SCHEMA_CONTEXT = 'https://schema.org';
const INDEX_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const NOINDEX_ROBOTS = 'noindex,follow';
const DEFAULT_IMAGE_PATH = '/assets/images/simc-social.jpg';
const MAX_DESCRIPTION_LENGTH = 160;

export type SeoStructuredData = Record<string, unknown>;

export interface SeoData {
  title: string;
  description: string;
  canonicalPath: string;
  canonicalUrl: string;
  robots: string;
  image?: string;
  imageUrl?: string;
  openGraphType: 'website' | 'article';
  structuredData: SeoStructuredData[];
}

export interface SeoRoute {
  path: string;
  lastmod?: string;
}

type DynamicKind = 'event' | 'press-release' | 'past-test';
type StaticKind = 'home' | 'archive' | 'page';

interface DynamicRoute {
  kind: DynamicKind;
  record: ContentRecord;
  canonicalPath: string;
}

interface StaticPage {
  kind: StaticKind;
  title: string;
  description: string;
  image?: string;
}

interface StaticPageDefinition extends StaticPage {
  collection?: boolean;
}

const STATIC_PAGES: Record<string, StaticPageDefinition> = {
  '/': {
    kind: 'home',
    title: SITE_NAME,
    description: 'Our goal is to inspire students to engage in mathematics and expand their mathematical interests and capabilities.',
    image: DEFAULT_IMAGE_PATH,
  },
  '/events': {
    kind: 'archive',
    title: 'Events',
    description: 'A collection of upcoming events from SIMC.',
  },
  '/resources': {
    kind: 'archive',
    title: 'Resources',
    description: 'Online classes, YouTube channels, books, and past tests from SIMC.',
  },
  '/past-tests': {
    kind: 'archive',
    title: 'Past tests',
    description: 'Past SIMC tests and competition materials.',
  },
  '/press-releases': {
    kind: 'archive',
    title: 'Press releases',
    description: 'A collection of all our press releases.',
  },
  '/contact': {
    kind: 'page',
    title: 'Contact Us',
    description: 'For questions, comments, or general inquiries, reach out to Seattle Infinity Math Circle through Discord or email.',
  },
  '/about-us': {
    kind: 'page',
    title: 'Student Leadership Group',
    description: 'Our student leaders create competitions, write problems, and expand math literacy for students across the Seattle area.',
    image: DEFAULT_IMAGE_PATH,
  },
  '/newsletters': {
    kind: 'archive',
    title: 'Newsletters',
    description: 'See past and current SIMC newsletters.',
  },
  '/calendar': {
    kind: 'page',
    title: 'Calendar',
    description: 'Upcoming SIMC events and competition dates.',
  },
  '/potm': {
    kind: 'page',
    title: 'Problems of the Month',
    description: 'Problems written by SIMC Student Leadership Group members.',
  },
};

const CANONICAL_DYNAMIC_ROUTES: DynamicRoute[] = [
  ...EVENT_CONTENT.map((record): DynamicRoute => ({ kind: 'event', record, canonicalPath: `/events/${record.slug}` })),
  ...PAST_TEST_CONTENT.map((record): DynamicRoute => ({ kind: 'past-test', record, canonicalPath: `/past-tests/${record.slug}` })),
  ...PRESS_CONTENT.map((record): DynamicRoute => ({ kind: 'press-release', record, canonicalPath: `/press-releases/${record.slug}` })),
];

const DYNAMIC_ROUTE_PREFIXES: Record<DynamicKind, 'events' | 'press-releases' | 'past-tests'> = {
  event: 'events',
  'past-test': 'past-tests',
  'press-release': 'press-releases',
};

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const normalizePath = (input: string): string => {
  let value = String(input || '').trim();

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(value)) {
    try {
      value = new URL(value).pathname;
    } catch {
      // Keep the input and apply the path cleanup below.
    }
  }

  const queryOrHash = value.search(/[?#]/);
  if (queryOrHash >= 0) value = value.slice(0, queryOrHash);
  if (!value) return '/';

  // Decode ordinary escaped characters while retaining a malformed path as-is.
  try {
    value = decodeURI(value);
  } catch {
    // A malformed escape should remain an unknown, noindex path.
  }

  if (!value.startsWith('/')) value = `/${value}`;
  value = value.replace(/\/+/g, '/');
  if (value.length > 1) value = value.replace(/\/+$/, '');
  return value || '/';
};

const slugKey = (value: string): string => {
  const decoded = safeDecode(value).replace(/^\/+|\/+$/g, '');
  return decoded
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

const isoDate = (date?: Date): string | undefined => {
  if (!date || Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
};

const dynamicRoutes = new Map<string, DynamicRoute>(CANONICAL_DYNAMIC_ROUTES.map((route) => [
  `${DYNAMIC_ROUTE_PREFIXES[route.kind]}/${slugKey(route.record.slug)}`,
  route,
]));

const dynamicSeoRoutes = CANONICAL_DYNAMIC_ROUTES.map((route) => {
  const seoRoute: SeoRoute = { path: route.canonicalPath };
  const lastmod = isoDate(route.record.dateValue);
  if (lastmod) seoRoute.lastmod = lastmod;
  return seoRoute;
});

export const SEO_ROUTES: SeoRoute[] = [
  ...Object.keys(STATIC_PAGES).map((path) => ({ path })),
  ...dynamicSeoRoutes,
];

const plainText = (value: string): string => value
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/<[^>]*>/g, ' ')
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/^\s{0,3}#{1,6}\s+/gm, '')
  .replace(/^\s*[-+*]\s+/gm, '')
  .replace(/[*_`~]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const concise = (value: string): string => {
  const text = plainText(value);
  if (text.length <= MAX_DESCRIPTION_LENGTH) return text;
  const clipped = text.slice(0, MAX_DESCRIPTION_LENGTH - 1).replace(/\s+\S*$/, '').trim();
  return `${clipped || text.slice(0, MAX_DESCRIPTION_LENGTH - 1).trim()}…`;
};

const absoluteUrl = (value: string): string => {
  try {
    return new URL(value, `${SITE_URL}/`).toString();
  } catch {
    return `${SITE_URL}/${value.replace(/^\/+/, '')}`;
  }
};

const publishedImagePath = (value?: string): string => value && !/^\/(?:src|@fs)(?:\/|$)/i.test(value)
  ? value
  : DEFAULT_IMAGE_PATH;

const canonicalUrl = (path: string): string => `${SITE_URL}${path === '/' ? '/' : path}`;

const documentTitle = (title: string): string => title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;

const contentDescription = (record: ContentRecord, kind: DynamicKind): string => {
  const fromBlurb = concise(record.blurb || record.description || '');
  if (fromBlurb) return fromBlurb;

  const fromBody = concise(record.body || '');
  if (fromBody) return fromBody;

  const title = concise(record.title);
  if (kind === 'event') return `Information about the SIMC event “${title}.”`;
  if (kind === 'past-test') return `Past SIMC test materials for “${title}.”`;
  return `A SIMC press release titled “${title}.”`;
};

const valueCounts = (getValue: (route: DynamicRoute) => string): Map<string, number> => {
  const counts = new Map<string, number>();
  CANONICAL_DYNAMIC_ROUTES.forEach((route) => {
    const value = getValue(route);
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return counts;
};

const dynamicTitleBase = (route: DynamicRoute): string => plainText(route.record.title) || SITE_NAME;
const dynamicDescriptionBase = (route: DynamicRoute): string => contentDescription(route.record, route.kind);
const DUPLICATE_DYNAMIC_TITLES = new Set([...valueCounts(dynamicTitleBase).entries()]
  .filter(([, count]) => count > 1)
  .map(([value]) => value));
const DUPLICATE_DYNAMIC_DESCRIPTIONS = new Set([...valueCounts(dynamicDescriptionBase).entries()]
  .filter(([, count]) => count > 1)
  .map(([value]) => value));

const dynamicContext = (route: DynamicRoute): string => {
  if (route.kind === 'event') return route.record.schedule || route.record.sourceSlug;
  if (route.kind === 'past-test') return route.record.hosted_date || route.record.year || route.record.sourceSlug;
  return isoDate(route.record.dateValue) || route.record.date || route.record.sourceSlug;
};

const disambiguatedValue = (
  route: DynamicRoute,
  base: string,
  duplicateValues: Set<string>,
): string => {
  if (!duplicateValues.has(base)) return base;
  const context = plainText(dynamicContext(route)) || route.record.slug;
  const peers = CANONICAL_DYNAMIC_ROUTES.filter((peer) => {
    const peerValue = duplicateValues === DUPLICATE_DYNAMIC_TITLES
      ? dynamicTitleBase(peer)
      : dynamicDescriptionBase(peer);
    return peerValue === base;
  });
  const sameContext = peers.filter((peer) => dynamicContext(peer) === dynamicContext(route)).length > 1;
  return `${base} (${context}${sameContext ? ` · ${route.record.slug}` : ''})`;
};

const dynamicTitleText = (route: DynamicRoute): string => disambiguatedValue(
  route,
  dynamicTitleBase(route),
  DUPLICATE_DYNAMIC_TITLES,
);

const dynamicDescription = (route: DynamicRoute): string => {
  const base = dynamicDescriptionBase(route);
  if (!DUPLICATE_DYNAMIC_DESCRIPTIONS.has(base)) return base;

  const context = plainText(dynamicContext(route)) || route.record.slug;
  const peers = CANONICAL_DYNAMIC_ROUTES.filter((peer) => dynamicDescriptionBase(peer) === base);
  const sameContext = peers.filter((peer) => dynamicContext(peer) === dynamicContext(route)).length > 1;
  const suffix = ` (${context}${sameContext ? ` · ${route.record.slug}` : ''})`;
  const available = MAX_DESCRIPTION_LENGTH - suffix.length;
  if (base.length <= available) return `${base}${suffix}`;

  const clippedLength = Math.max(1, available - 1);
  const clipped = base.slice(0, clippedLength).replace(/\s+\S*$/, '').trim() || base.slice(0, clippedLength).trim();
  return `${clipped}…${suffix}`;
};

const websiteReference = (): SeoStructuredData => ({
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
});

const breadcrumbSchema = (canonicalPath: string, title: string, parent?: { name: string; path: string }): SeoStructuredData => {
  const items: SeoStructuredData[] = [
    { '@type': 'ListItem', position: 1, name: SITE_NAME, item: canonicalUrl('/') },
  ];
  if (parent) {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: parent.name,
      item: canonicalUrl(parent.path),
    });
  }
  items.push({
    '@type': 'ListItem',
    position: items.length + 1,
    name: title,
    item: canonicalUrl(canonicalPath),
  });

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
};

const pageSchema = (
  page: StaticPage,
  path: string,
  description: string,
  image?: string,
): SeoStructuredData => ({
  '@context': SCHEMA_CONTEXT,
  '@type': page.kind === 'archive' ? 'CollectionPage' : 'WebPage',
  name: page.title,
  description,
  url: canonicalUrl(path),
  isPartOf: websiteReference(),
  ...(image ? { image: absoluteUrl(image) } : {}),
});

const dynamicPageSchema = (
  route: DynamicRoute,
  title: string,
  description: string,
  url: string,
  image?: string,
): SeoStructuredData => {
  const record = route.record;
  if (route.kind === 'press-release' && record.dateValue && !Number.isNaN(record.dateValue.getTime())) {
    return {
      '@context': SCHEMA_CONTEXT,
      '@type': 'NewsArticle',
      headline: title,
      description,
      url,
      datePublished: record.dateValue.toISOString(),
      author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      ...(image ? { image } : {}),
    };
  }

  if (route.kind === 'past-test') {
    return {
      '@context': SCHEMA_CONTEXT,
      '@type': 'LearningResource',
      name: title,
      description,
      url,
      learningResourceType: 'Past test',
      provider: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      ...(image ? { image } : {}),
    };
  }

  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'WebPage',
    name: title,
    description,
    url,
    isPartOf: websiteReference(),
    ...(image ? { image } : {}),
  };
};

const resolveDynamicRoute = (path: string): DynamicRoute | undefined => {
  const match = /^\/(events|press-releases|past-tests)\/([^/]+)$/.exec(path);
  if (!match) return undefined;
  const key = slugKey(match[2]);
  return key ? dynamicRoutes.get(`${match[1]}/${key}`) : undefined;
};

const emptySeoData = (path: string): SeoData => ({
  title: 'Page not found | Seattle Infinity Math Circle',
  description: 'The requested Seattle Infinity Math Circle page could not be found.',
  canonicalPath: path,
  canonicalUrl: canonicalUrl(path),
  robots: NOINDEX_ROBOTS,
  openGraphType: 'website',
  structuredData: [],
});

const staticSeoData = (path: string, page: StaticPageDefinition): SeoData => {
  const title = documentTitle(page.title);
  const description = concise(page.description);
  const image = absoluteUrl(publishedImagePath(page.image));
  const structuredData: SeoStructuredData[] = [];

  if (page.kind === 'home') {
    structuredData.push(
      {
        '@context': SCHEMA_CONTEXT,
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
        logo: absoluteUrl('/int.svg'),
      },
      {
        '@context': SCHEMA_CONTEXT,
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
        description,
      },
    );
  } else {
    structuredData.push(pageSchema(page, path, description, image));
    structuredData.push(breadcrumbSchema(path, page.title));
  }

  return {
    title,
    description,
    canonicalPath: path,
    canonicalUrl: canonicalUrl(path),
    robots: INDEX_ROBOTS,
    image,
    imageUrl: image,
    openGraphType: 'website',
    structuredData,
  };
};

const dynamicSeoData = (route: DynamicRoute): SeoData => {
  const contentTitle = dynamicTitleText(route);
  const title = documentTitle(contentTitle);
  const description = dynamicDescription(route);
  const image = absoluteUrl(publishedImagePath(route.record.image));
  const url = canonicalUrl(route.canonicalPath);
  const parent = route.kind === 'event'
    ? { name: 'Events', path: '/events' }
    : route.kind === 'past-test'
      ? { name: 'Past tests', path: '/past-tests' }
      : { name: 'Press releases', path: '/press-releases' };

  return {
    title,
    description,
    canonicalPath: route.canonicalPath,
    canonicalUrl: url,
    robots: INDEX_ROBOTS,
    image,
    imageUrl: image,
    openGraphType: route.kind === 'press-release' ? 'article' : 'website',
    structuredData: [
      dynamicPageSchema(route, contentTitle, description, url, image),
      breadcrumbSchema(route.canonicalPath, contentTitle, parent),
    ],
  };
};

export function getSeoData(pathname: string): SeoData {
  const normalizedPath = normalizePath(pathname);
  const canonicalPath = getRedirectTarget(normalizedPath) || normalizedPath;
  const staticPage = STATIC_PAGES[canonicalPath];
  if (staticPage) return staticSeoData(canonicalPath, staticPage);

  const dynamicRoute = resolveDynamicRoute(canonicalPath);
  if (dynamicRoute) return dynamicSeoData(dynamicRoute);

  return emptySeoData(normalizedPath);
}

import type { MetaDescriptor } from 'react-router';
import { getSeoData, SITE_URL } from './seo';

const SITE_NAME = 'Seattle Infinity Math Circle';
const NOINDEX_DIRECTIVE = /(?:^|[\s,;])noindex(?:$|[\s,;])/iu;
const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/assets/images/simc-social.jpg`;

function imageUrlFor(seoData: ReturnType<typeof getSeoData>): string | undefined {
  const image = seoData.imageUrl || seoData.image;
  if (!image) return undefined;

  try {
    const url = new URL(image, SITE_URL);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function imageAltFor(seoData: ReturnType<typeof getSeoData>): string {
  const suffix = ` | ${SITE_NAME}`;
  const title = seoData.title.endsWith(suffix)
    ? seoData.title.slice(0, -suffix.length).trim()
    : seoData.title.trim();
  return title || SITE_NAME;
}

function imageTypeFor(imageUrl: string): string | undefined {
  const pathname = new URL(imageUrl).pathname.toLowerCase();
  if (/\.jpe?g$/u.test(pathname)) return 'image/jpeg';
  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.webp')) return 'image/webp';
  if (pathname.endsWith('.gif')) return 'image/gif';
  if (pathname.endsWith('.svg')) return 'image/svg+xml';
  return undefined;
}

/**
 * Build route metadata using React Router's official descriptor format. The
 * framework owns rendering, escaping, and reconciliation of these descriptors
 * on both the server and client.
 */
export function getSeoMeta(pathname: string): MetaDescriptor[] {
  const seoData = getSeoData(pathname);
  const imageUrl = imageUrlFor(seoData);
  const imageAlt = imageUrl ? imageAltFor(seoData) : undefined;
  const noindex = NOINDEX_DIRECTIVE.test(seoData.robots);

  const descriptors: MetaDescriptor[] = [
    { title: seoData.title },
    { name: 'description', content: seoData.description },
    { name: 'robots', content: seoData.robots },
    { property: 'og:title', content: seoData.title },
    { property: 'og:description', content: seoData.description },
    { property: 'og:type', content: seoData.openGraphType },
    { name: 'twitter:card', content: imageUrl ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: seoData.title },
    { name: 'twitter:description', content: seoData.description },
  ];

  if (!noindex) {
    descriptors.push(
      { tagName: 'link', rel: 'canonical', href: seoData.canonicalUrl },
      { property: 'og:url', content: seoData.canonicalUrl },
    );
  }

  if (imageUrl && imageAlt) {
    const imageType = imageTypeFor(imageUrl);
    descriptors.push(
      { property: 'og:image', content: imageUrl },
      { property: 'og:image:alt', content: imageAlt },
      { name: 'twitter:image', content: imageUrl },
      { name: 'twitter:image:alt', content: imageAlt },
    );
    if (imageType) descriptors.push({ property: 'og:image:type', content: imageType });
    if (imageUrl === DEFAULT_SOCIAL_IMAGE) {
      descriptors.push(
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
      );
    }
  }

  seoData.structuredData.forEach((record) => {
    descriptors.push({ 'script:ld+json': record });
  });

  return descriptors;
}

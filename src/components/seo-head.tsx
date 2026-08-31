import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getSeoData } from '../seo';

const MANAGED_ATTRIBUTE = 'data-simc-seo';
const CANONICAL_KEY = 'canonical';
const STRUCTURED_DATA_KEY = 'structured-data';

type MetaAttribute = 'name' | 'property';

interface MetaSpec {
  key: string;
  attribute: MetaAttribute;
  value: string;
  content?: string;
}

function headElements(tagName: string): Element[] {
  if (typeof document === 'undefined') return [];
  const normalizedTagName = tagName.toLowerCase();
  return Array.from(document.head.children).filter(
    (element) => element.tagName.toLowerCase() === normalizedTagName,
  );
}

function managedElements(tagName: string, key: string): Element[] {
  return headElements(tagName).filter((element) => element.getAttribute(MANAGED_ATTRIBUTE) === key);
}

function firstUnmanagedMeta(attribute: MetaAttribute, value: string): HTMLMetaElement | undefined {
  return headElements('meta').find(
    (element) => !element.hasAttribute(MANAGED_ATTRIBUTE) && element.getAttribute(attribute) === value,
  ) as HTMLMetaElement | undefined;
}

function removeManagedDuplicates(tagName: string, key: string): Element | undefined {
  const matches = managedElements(tagName, key);
  matches.slice(1).forEach((element) => element.remove());
  return matches[0];
}

function syncMeta(spec: MetaSpec): void {
  const managed = removeManagedDuplicates('meta', spec.key) as HTMLMetaElement | undefined;
  if (!spec.content) {
    managed?.remove();
    return;
  }

  const meta = managed || firstUnmanagedMeta(spec.attribute, spec.value) || document.createElement('meta');
  meta.setAttribute(spec.attribute, spec.value);
  meta.setAttribute('content', spec.content);
  meta.setAttribute(MANAGED_ATTRIBUTE, spec.key);
  if (!meta.parentNode) document.head.appendChild(meta);
}

function isCanonicalLink(element: Element): boolean {
  return element
    .getAttribute('rel')
    ?.split(/\s+/)
    .some((relation) => relation.toLowerCase() === CANONICAL_KEY) || false;
}

function syncCanonical(canonicalUrl: string): void {
  const managed = removeManagedDuplicates('link', CANONICAL_KEY) as HTMLLinkElement | undefined;
  const existing = managed || headElements('link').find(
    (element) => !element.hasAttribute(MANAGED_ATTRIBUTE) && isCanonicalLink(element),
  ) as HTMLLinkElement | undefined;
  const canonical = existing || document.createElement('link');
  canonical.setAttribute('rel', CANONICAL_KEY);
  canonical.setAttribute('href', canonicalUrl);
  canonical.setAttribute(MANAGED_ATTRIBUTE, CANONICAL_KEY);
  if (!canonical.parentNode) document.head.appendChild(canonical);
}

function imageUrlFor(seoData: ReturnType<typeof getSeoData>): string | undefined {
  const image = seoData.imageUrl || seoData.image;
  if (!image) return undefined;

  try {
    return new URL(image, seoData.canonicalUrl).toString();
  } catch {
    return image;
  }
}

function syncStructuredData(structuredData: ReturnType<typeof getSeoData>['structuredData']): void {
  managedElements('script', STRUCTURED_DATA_KEY).forEach((element) => element.remove());

  const records = Array.isArray(structuredData)
    ? structuredData
    : structuredData
      ? [structuredData]
      : [];

  records.forEach((record) => {
    if (!record || typeof record !== 'object') return;

    let serialized: string | undefined;
    try {
      serialized = JSON.stringify(record);
    } catch {
      return;
    }
    if (!serialized) return;

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute(MANAGED_ATTRIBUTE, STRUCTURED_DATA_KEY);
    script.textContent = serialized;
    document.head.appendChild(script);
  });
}

function syncDocumentHead(pathname: string): void {
  const seoData = getSeoData(pathname);
  const imageUrl = imageUrlFor(seoData);

  document.title = seoData.title;
  syncMeta({ key: 'description', attribute: 'name', value: 'description', content: seoData.description });
  syncMeta({ key: 'robots', attribute: 'name', value: 'robots', content: seoData.robots });
  syncMeta({ key: 'og-title', attribute: 'property', value: 'og:title', content: seoData.title });
  syncMeta({ key: 'og-description', attribute: 'property', value: 'og:description', content: seoData.description });
  syncMeta({ key: 'og-url', attribute: 'property', value: 'og:url', content: seoData.canonicalUrl });
  syncMeta({ key: 'og-type', attribute: 'property', value: 'og:type', content: seoData.openGraphType });
  syncMeta({ key: 'og-image', attribute: 'property', value: 'og:image', content: imageUrl });
  syncMeta({ key: 'twitter-card', attribute: 'name', value: 'twitter:card', content: imageUrl ? 'summary_large_image' : 'summary' });
  syncMeta({ key: 'twitter-title', attribute: 'name', value: 'twitter:title', content: seoData.title });
  syncMeta({ key: 'twitter-description', attribute: 'name', value: 'twitter:description', content: seoData.description });
  syncMeta({ key: 'twitter-image', attribute: 'name', value: 'twitter:image', content: imageUrl });
  syncCanonical(seoData.canonicalUrl);
  syncStructuredData(seoData.structuredData);
}

export function SeoHead(): null {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    syncDocumentHead(pathname);
  }, [pathname]);

  return null;
}

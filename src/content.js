/** @typedef {{ slug: string, title: string, date?: string, blurb?: string, image?: string, body: string, sourcePath: string }} ContentRecord */

const PRESS_FILES = import.meta.glob('./press-releases/*/index.md', { query: '?raw', import: 'default', eager: true });
const EVENT_FILES = import.meta.glob('./events/*/index.md', { query: '?raw', import: 'default', eager: true });
const PAST_TEST_FILES = import.meta.glob('./past-tests/*/index.md', { query: '?raw', import: 'default', eager: true });
const PAGE_FILES = import.meta.glob('./**/index.md', { query: '?raw', import: 'default', eager: true });
const ASSET_FILES = {
  ...import.meta.glob('./press-releases/*/*.{png,jpg,jpeg,gif,webp,svg,pdf}', { query: '?url', import: 'default', eager: true }),
  ...import.meta.glob('./events/*/*.{png,jpg,jpeg,gif,webp,svg,pdf}', { query: '?url', import: 'default', eager: true }),
  ...import.meta.glob('./past-tests/*/*.{png,jpg,jpeg,gif,webp,svg,pdf}', { query: '?url', import: 'default', eager: true }),
};

export const slugify = (value) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const dateValue = (value) => {
  if (!value) return undefined;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00`);
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const parseScalar = (value) => {
  const trimmed = value.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1).replace(/''/g, "'");
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\//g, '/');
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  return trimmed;
};

const parseFrontMatter = (raw) => {
  if (!raw.startsWith('---')) return { data: {}, content: raw };
  const end = raw.indexOf('\n---', 3);
  if (end < 0) return { data: {}, content: raw };
  const data = {};
  let activeKey = '';
  raw.slice(4, end).split(/\r?\n/).forEach((line) => {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (match) {
      activeKey = match[1];
      data[activeKey] = match[2].trim();
    } else if (activeKey && line.trim()) {
      data[activeKey] = `${data[activeKey]}\n${line.trim()}`;
    }
  });
  Object.keys(data).forEach((key) => { data[key] = parseScalar(data[key]); });
  return { data, content: raw.slice(end + 4) };
};

export const formatDate = (value) => {
  const date = dateValue(value);
  return date ? date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
};

const resolveLocalAsset = (sourcePath, value) => {
  if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/|data:|#|\/)/i.test(value)) return value;
  const match = /^([^?#]*)([?#].*)?$/.exec(value);
  const pathname = match?.[1] || value;
  const suffix = match?.[2] || '';
  const directory = sourcePath.slice(0, sourcePath.lastIndexOf('/'));
  const assetPath = pathname.split('/').reduce((parts, segment) => {
    if (!segment || segment === '.') return parts;
    if (segment === '..') return parts.slice(0, -1);
    return [...parts, segment];
  }, directory.split('/'));
  const asset = ASSET_FILES[`${assetPath.join('/')}`];
  return asset ? `${asset}${suffix}` : value;
};

const splitMaterials = (sourcePath, value) => String(value || '')
  .split(/\s*;\s*/)
  .map((href) => resolveLocalAsset(sourcePath, href.trim()))
  .filter(Boolean)
  .map((href) => ({
    href,
    embedSrc: href.match(/^https?:\/\/drive\.google\.com\/file\/d\/([^/]+)/i)
      ? `https://drive.google.com/file/d/${href.match(/^https?:\/\/drive\.google\.com\/file\/d\/([^/]+)/i)[1]}/preview`
      : (/\.pdf(?:[?#]|$)/i.test(href) || href.startsWith('/')) ? href : null,
  }));

const rewriteLocalAssets = (sourcePath, body) => body
  .replace(/(\]\()([^\s)]+)/g, (_, prefix, value) => `${prefix}${resolveLocalAsset(sourcePath, value)}`)
  .replace(/(<(?:img|source)\b[^>]+\b(?:src|srcset)=['"])([^'"]+)(['"])/gi, (_, prefix, value, suffix) => `${prefix}${resolveLocalAsset(sourcePath, value)}${suffix}`);

const parseRecord = (path, raw) => {
  const parsed = parseFrontMatter(raw);
  const sourceSlug = path.split('/').slice(-2, -1)[0];
  const title = parsed.data.title || sourceSlug;
  const body = rewriteLocalAssets(path, parsed.content.trim().replace(/\{\{\s*title\s*\}\}/g, title));
  return {
    ...parsed.data,
    title,
    slug: slugify(sourceSlug),
    sourceSlug,
    sourcePath: path.replace(/^\.\//, 'src/'),
    dateValue: dateValue(parsed.data.date),
    date: formatDate(parsed.data.date) || parsed.data.date || '',
    description: parsed.data.blurb || '',
    image: resolveLocalAsset(path, parsed.data.image),
    problemPdfs: splitMaterials(path, parsed.data.problem_pdfs),
    solutionLinks: splitMaterials(path, parsed.data.solution_links),
    sourceLinks: splitMaterials(path, parsed.data.source_links),
    pastTests: String(parsed.data.past_tests || '').split(/\s*;\s*/).filter(Boolean),
    body,
  };
};

const recordsFrom = (modules) => Object.entries(modules).map(([path, raw]) => parseRecord(path, raw));
const bySlug = (records) => Object.fromEntries(records.flatMap((record) => [
  [record.slug, record],
  [record.sourceSlug, record],
  ...String(record.aliases || '').split(/\s*;\s*/).filter(Boolean).flatMap((alias) => [[alias, record], [slugify(alias), record]]),
]));

export const PRESS_CONTENT = recordsFrom(PRESS_FILES)
  .filter(({ type }) => type !== 'page')
  .sort((a, b) => (b.dateValue?.getTime() || 0) - (a.dateValue?.getTime() || 0));
export const EVENT_CONTENT = recordsFrom(EVENT_FILES).filter(({ type }) => type !== 'page');
export const PAST_TEST_CONTENT = recordsFrom(PAST_TEST_FILES).filter(({ type }) => type === 'past-test');
export const PAGE_CONTENT = recordsFrom(PAGE_FILES).filter(({ type }) => type === 'page');

export const PRESS_CONTENT_BY_SLUG = bySlug(PRESS_CONTENT);
export const EVENT_CONTENT_BY_SLUG = bySlug(EVENT_CONTENT);
export const PAST_TEST_CONTENT_BY_SLUG = bySlug(PAST_TEST_CONTENT);
export const PAGE_CONTENT_BY_SLUG = Object.fromEntries(PAGE_CONTENT.map((record) => [record.slug, record]));

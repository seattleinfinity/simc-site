export interface Material {
  href: string;
  embedSrc: string | null;
}

export interface ContentRecord {
  [key: string]: string | boolean | Date | Material[] | string[] | undefined;
  slug: string;
  sourceSlug: string;
  sourcePath: string;
  title: string;
  body: string;
  description: string;
  date?: string;
  dateValue?: Date;
  image?: string;
  type?: string;
  layout?: string;
  tags?: string;
  blurb?: string;
  schedule?: string;
  featured?: boolean;
  aliases?: string;
  category?: string;
  year?: string;
  hosted_date?: string;
  pastTests: string[];
  problemPdfs: Material[];
  solutionLinks: Material[];
  sourceLinks: Material[];
}

type RawFrontMatter = Record<string, string | boolean>;
type RawModules = Record<string, string>;

const PRESS_FILES = import.meta.glob('./press-releases/*/index.md', { query: '?raw', import: 'default', eager: true }) as RawModules;
const EVENT_FILES = import.meta.glob('./events/*/index.md', { query: '?raw', import: 'default', eager: true }) as RawModules;
const PAST_TEST_FILES = import.meta.glob('./past-tests/*/index.md', { query: '?raw', import: 'default', eager: true }) as RawModules;
const PAGE_FILES = import.meta.glob('./**/index.md', { query: '?raw', import: 'default', eager: true }) as RawModules;
const ASSET_FILES = {
  ...import.meta.glob('./press-releases/*/*.{png,jpg,jpeg,gif,webp,svg,pdf}', { query: '?url', import: 'default', eager: true }),
  ...import.meta.glob('./events/*/*.{png,jpg,jpeg,gif,webp,svg,pdf}', { query: '?url', import: 'default', eager: true }),
  ...import.meta.glob('./past-tests/*/*.{png,jpg,jpeg,gif,webp,svg,pdf}', { query: '?url', import: 'default', eager: true }),
} as RawModules;

export const slugify = (value: string): string => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const stringValue = (value: unknown): string | undefined => typeof value === 'string' ? value : undefined;

const dateValue = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  const date = value instanceof Date
    ? value
    : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`)
      : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const parseScalar = (value: string): string | boolean => {
  const trimmed = value.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1).replace(/''/g, "'");
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\//g, '/');
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  return trimmed;
};

const parseFrontMatter = (raw: string): { data: RawFrontMatter; content: string } => {
  if (!raw.startsWith('---')) return { data: {}, content: raw };
  const end = raw.indexOf('\n---', 3);
  if (end < 0) return { data: {}, content: raw };

  const data: RawFrontMatter = {};
  let activeKey: string | undefined;
  raw.slice(4, end).split(/\r?\n/).forEach((line) => {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (match) {
      activeKey = match[1];
      data[activeKey] = parseScalar(match[2]);
    } else if (activeKey && line.trim()) {
      data[activeKey] = `${String(data[activeKey] ?? '')}\n${line.trim()}`;
    }
  });

  return { data, content: raw.slice(end + 4) };
};

export const formatDate = (value: unknown): string => {
  const date = dateValue(value);
  return date ? date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
};

const resolveLocalAsset = (sourcePath: string, value?: string): string | undefined => {
  if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/|data:|#|\/)/i.test(value)) return value;
  const match = /^([^?#]*)([?#].*)?$/.exec(value);
  const pathname = match?.[1] || value;
  const suffix = match?.[2] || '';
  const directory = sourcePath.slice(0, sourcePath.lastIndexOf('/'));
  const assetPath = pathname.split('/').reduce<string[]>((parts, segment) => {
    if (!segment || segment === '.') return parts;
    if (segment === '..') return parts.slice(0, -1);
    return [...parts, segment];
  }, directory.split('/'));
  const asset = ASSET_FILES[assetPath.join('/')];
  return asset ? `${asset}${suffix}` : value;
};

const splitList = (value: unknown): string[] => typeof value === 'string'
  ? value.split(/\s*;\s*/).filter(Boolean)
  : [];

const splitMaterials = (sourcePath: string, value: unknown): Material[] => splitList(value)
  .map((href) => resolveLocalAsset(sourcePath, href))
  .filter((href): href is string => Boolean(href))
  .map((href) => {
    const driveFileId = /^https?:\/\/drive\.google\.com\/file\/d\/([^/]+)/i.exec(href)?.[1];
    return {
      href,
      embedSrc: driveFileId
        ? `https://drive.google.com/file/d/${driveFileId}/preview`
        : (/\.pdf(?:[?#]|$)/i.test(href) || href.startsWith('/')) ? href : null,
    };
  });

const rewriteLocalAssets = (sourcePath: string, body: string): string => body
  .replace(/(\]\()([^\s)]+)/g, (_, prefix: string, value: string) => `${prefix}${resolveLocalAsset(sourcePath, value)}`)
  .replace(/(<(?:img|source)\b[^>]+\b(?:src|srcset)=['"])([^'"]+)(['"])/gi, (_, prefix: string, value: string, suffix: string) => `${prefix}${resolveLocalAsset(sourcePath, value)}${suffix}`);

const parseRecord = (path: string, raw: string): ContentRecord => {
  const parsed = parseFrontMatter(raw);
  const sourceSlug = path.split('/').slice(-2, -1)[0] || 'untitled';
  const title = stringValue(parsed.data.title) || sourceSlug;
  const body = rewriteLocalAssets(path, parsed.content.trim().replace(/\{\{\s*title\s*\}\}/g, title));
  const rawDate = stringValue(parsed.data.date);

  return {
    ...parsed.data,
    title,
    slug: slugify(sourceSlug),
    sourceSlug,
    sourcePath: path.replace(/^\.\//, 'src/'),
    dateValue: dateValue(parsed.data.date),
    date: formatDate(parsed.data.date) || rawDate || '',
    description: stringValue(parsed.data.blurb) || '',
    image: resolveLocalAsset(path, stringValue(parsed.data.image)),
    problemPdfs: splitMaterials(path, parsed.data.problem_pdfs),
    solutionLinks: splitMaterials(path, parsed.data.solution_links),
    sourceLinks: splitMaterials(path, parsed.data.source_links),
    pastTests: splitList(parsed.data.past_tests),
    body,
  };
};

const recordsFrom = (modules: RawModules): ContentRecord[] => Object.entries(modules).map(([path, raw]) => parseRecord(path, raw));

const bySlug = (records: ContentRecord[]): Record<string, ContentRecord> => Object.fromEntries(records.flatMap((record) => {
  const aliases = typeof record.aliases === 'string' ? splitList(record.aliases) : [];
  return [
    [record.slug, record],
    [record.sourceSlug, record],
    ...aliases.flatMap((alias) => [[alias, record], [slugify(alias), record]]),
  ];
}));

export const PRESS_CONTENT = recordsFrom(PRESS_FILES)
  .filter(({ type }) => type !== 'page')
  .sort((a, b) => (b.dateValue?.getTime() || 0) - (a.dateValue?.getTime() || 0));
export const EVENT_CONTENT = recordsFrom(EVENT_FILES).filter(({ type }) => type !== 'page');
export const PAST_TEST_CONTENT = recordsFrom(PAST_TEST_FILES).filter(({ type }) => type === 'past-test');
export const PAGE_CONTENT = recordsFrom(PAGE_FILES).filter(({ type }) => type === 'page');

export const PRESS_CONTENT_BY_SLUG = bySlug(PRESS_CONTENT);
export const EVENT_CONTENT_BY_SLUG = bySlug(EVENT_CONTENT);
export const PAST_TEST_CONTENT_BY_SLUG = bySlug(PAST_TEST_CONTENT);
export const PAGE_CONTENT_BY_SLUG: Record<string, ContentRecord> = Object.fromEntries(PAGE_CONTENT.map((record) => [record.slug, record]));

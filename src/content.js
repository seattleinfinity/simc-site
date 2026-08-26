/** @typedef {{ slug: string, title: string, date?: string, blurb?: string, image?: string, body: string, sourcePath: string }} ContentRecord */

const PRESS_FILES = import.meta.glob('./press-releases/*.md', { query: '?raw', import: 'default', eager: true });
const EVENT_FILES = import.meta.glob('./events/*.md', { query: '?raw', import: 'default', eager: true });
const PAGE_FILES = import.meta.glob('./*.md', { query: '?raw', import: 'default', eager: true });

const basename = (path) => path.split('/').pop().replace(/\.md$/, '');

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

const parseRecord = (path, raw) => {
  const parsed = parseFrontMatter(raw);
  const sourceSlug = basename(path);
  const title = parsed.data.title || sourceSlug;
  const body = parsed.content.trim().replace(/\{\{\s*title\s*\}\}/g, title);
  return {
    ...parsed.data,
    title,
    slug: slugify(sourceSlug),
    sourceSlug,
    sourcePath: path.replace(/^\.\//, 'src/'),
    dateValue: dateValue(parsed.data.date),
    date: formatDate(parsed.data.date),
    description: parsed.data.blurb || '',
    body,
  };
};

const recordsFrom = (modules) => Object.entries(modules).map(([path, raw]) => parseRecord(path, raw));

export const PRESS_CONTENT = recordsFrom(PRESS_FILES).sort((a, b) => (b.dateValue?.getTime() || 0) - (a.dateValue?.getTime() || 0));
export const EVENT_CONTENT = recordsFrom(EVENT_FILES);
export const PAGE_CONTENT = recordsFrom(PAGE_FILES);

export const LEGACY_PRESS_CONTENT = PRESS_CONTENT.find((record) => record.slug === 'past-press-releases');

export const PRESS_CONTENT_BY_SLUG = Object.fromEntries(
  PRESS_CONTENT.flatMap((record) => [[record.slug, record], [record.sourceSlug, record]])
);

export const EVENT_CONTENT_BY_SLUG = Object.fromEntries(
  EVENT_CONTENT.flatMap((record) => [[record.slug, record], [record.sourceSlug, record]])
);

export const PAGE_CONTENT_BY_SLUG = Object.fromEntries(PAGE_CONTENT.map((record) => [record.slug, record]));

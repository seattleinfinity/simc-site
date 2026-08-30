import SLG_DATA from './slg.json';
import { EVENT_CONTENT, type ContentRecord } from '../content';

export const EMAIL = 'seattleinfinitymathcircle@gmail.com';
export const DISCORD_URL = 'https://discord.gg/wwyZnWB2tw';
export const INSTAGRAM_URL = 'https://www.instagram.com/seattleinfinitymathcircle/';
export const CALENDAR_EMBED_URL = 'https://calendar.google.com/calendar/embed?height=600&wkst=1&bgcolor=%23ffffff&ctz=America%2FLos_Angeles&showTitle=1&showCalendars=1&mode=AGENDA&src=YTkxNzhhNzU4ZGRjYjhmM2FjM2ZmNGQ1MWQ2OGNiNTcwNjdmMDUyODljZTc4YmUyNDliMDM0MWJhNmQyYzY3MUBncm91cC5jYWxlbmRhci5nb29nbGUuY29t&color=%23C0CA33';

export interface Sponsor {
  name: string;
  href: string;
  image: string;
  className: string;
}

export type Award = [competition: string, rank: string];

export interface AwardsYear {
  year: string;
  rows: number;
  awards: Award[];
}

export const SPONSORS: Sponsor[] = [
  { name: 'Jane Street', href: 'https://www.janestreet.com/', image: '/assets/images/sponsors/jane-street-logo.svg', className: 'sponsor-image-jane' },
  { name: 'AoPS Academy Bellevue', href: 'https://bellevue.aopsacademy.org/', image: '/assets/images/sponsors/aops-logo.svg', className: 'sponsor-image-aops' },
  { name: 'X-Camp', href: 'https://www.x-camp.org/', image: '/assets/images/sponsors/xcamp-logo.svg', className: 'sponsor-image-xcamp' },
];

export const AWARDS_BY_YEAR: AwardsYear[] = [
  {
    year: '2025 — 2026',
    rows: 4,
    awards: [
      ['HMMT February 2026', '1st'],
      ['HMMT Guts February 2026', '1st'],
      ['HMMT Team Round February 2026', '5th'],
      ['SMT 2026', '1st'],
      ['SMT Guts 2026', '1st'],
      ['SMT Power 2026', '2nd'],
      ['SMT Team Round 2026', '10th'],
      ['PUMaC 2025', '2nd'],
      ['PUMaC Power 2025', '7th'],
      ['PUMaC Team Round 2025', '5th'],
      ['BMT 2025', '7th'],
      ['CMIMC TCS Round 2026', '10th'],
    ],
  },
  {
    year: '2024 — 2025',
    rows: 4,
    awards: [
      ['HMMT February 2025', '7th'],
      ['HMMT Guts February 2025', '7th'],
      ['HMMT Team Round February 2025', '9th'],
      ['SMT 2025', '1st'],
      ['SMT Guts 2025', '1st'],
      ['SMT Power 2025', '1st'],
      ['SMT Team Round 2025', '1st'],
      ['PUMaC 2024', '5th'],
      ['PUMaC Power 2024', '6th'],
      ['PUMaC Team Round 2024', '7th'],
      ['BMT 2024', '4th'],
      ['BMT Guts 2024', '4th'],
      ['BMT Power 2024', '3rd'],
    ],
  },
  {
    year: '2023 — 2024',
    rows: 2,
    awards: [
      ['HMMT February 2024', '5th'],
      ['HMMT Guts February 2024', '2nd'],
      ['HMMT Guts February 2024 (2nd team)', '5th'],
      ['BMT 2023', '3rd'],
      ['BMT Guts 2023', '5th'],
      ['BMT Power 2023', '1st'],
    ],
  },
  {
    year: '2022 — 2023',
    rows: 2,
    awards: [
      ['HMMT February 2023', '9th'],
      ['HMMT Guts February 2023', '9th'],
      ['HMMT Team Round February 2023', '8th'],
      ['PUMaC 2022', '3rd'],
      ['PUMaC Power 2022', '2nd'],
      ['PUMaC Team Round 2022', '3rd'],
    ],
  },
  {
    year: '2021 — 2022',
    rows: 2,
    awards: [
      ['HMMT February 2022', '8th'],
      ['HMMT Guts February 2022', '9th'],
      ['HMMT Team Round February 2022', '8th'],
      ['PUMaC Team Round 2021', '10th'],
    ],
  },
];

const TOP_THREE = new Set<string>(['1st', '2nd', '3rd']);
export const CAROUSEL_AWARDS = AWARDS_BY_YEAR.flatMap(({ awards }) => awards.filter(([, rank]) => TOP_THREE.has(rank)));

const EVENT_ITEMS: ContentRecord[] = EVENT_CONTENT.map((event) => ({
  ...event,
  date: event.schedule || event.date,
}));

const SCHEDULE_MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  winter: 1,
  spring: 3,
  summer: 6,
  fall: 9,
  autumn: 9,
};
const CURRENT_MONTH = new Date().getMonth() + 1;
const eventSortKey = (schedule?: string): number => {
  const text = String(schedule || '').toLowerCase();
  const months = [...new Set(Object.entries(SCHEDULE_MONTHS)
    .filter(([label]) => text.includes(label))
    .map(([, month]) => month))];
  const phase = text.includes('early') ? 0 : text.includes('late') ? 2 : 1;
  if (!months.length) return 120;
  return Math.min(...months.map((month) => ((month - CURRENT_MONTH + 12) % 12) * 3 + phase));
};

export const UPCOMING_EVENTS = EVENT_ITEMS
  .filter(({ featured }) => featured)
  .sort((a, b) => eventSortKey(a.date) - eventSortKey(b.date));

interface SourcePerson {
  name: string;
  title?: string;
  photoURL?: string;
  bio: string;
}

export interface Person {
  name: string;
  role: string;
  image?: string;
  bio: string;
}

const FEATURED_PEOPLE: Record<string, number> = { 'Erin Bian': 0, 'Christopher Peng': 1, 'Raymond Zhu': 2 };
const seniorityRank = (bio: string): number => {
  const text = String(bio || '').toLowerCase();
  if (/\bsenior\b/.test(text)) return 0;
  if (/\bjunior\b/.test(text)) return 1;
  if (/\bsophomore\b/.test(text)) return 2;
  return 3;
};

export const PEOPLE: Person[] = [...(SLG_DATA as SourcePerson[])]
  .sort((a, b) =>
    (FEATURED_PEOPLE[a.name] ?? 3) - (FEATURED_PEOPLE[b.name] ?? 3)
    || seniorityRank(a.bio) - seniorityRank(b.bio)
    || a.name.localeCompare(b.name)
  )
  .map(({ name, title, photoURL, bio }) => ({
    name,
    role: title || '',
    image: photoURL,
    bio,
  }));

export const TEST_CATEGORY_LABELS: Record<string, string> = {
  'mock-aime': 'Mock AIME',
  'mock-amc8': 'Mock AMC 8',
  'mock-amc10': 'Mock AMC 10',
  'mock-amc12': 'Mock AMC 12',
  'mock-mathcounts': 'Mock MATHCOUNTS',
  elementary: 'Elementary competition',
  tst: 'SIMC TST',
};

export const TEST_CARD_DESCRIPTIONS: Record<string, string> = {
  'mock-aime': 'A practice AIME-style test.',
  'mock-amc8': 'A practice AMC 8-style test.',
  'mock-amc10': 'A practice AMC 10-style test.',
  'mock-amc12': 'A practice AMC 12-style test.',
  'mock-mathcounts': 'A practice MATHCOUNTS competition.',
  elementary: 'A practice elementary math competition.',
  tst: 'A team selection test for math tournaments.',
};

export const formatTestYear = (year?: string | number): string => {
  const endYear = Number(year);
  return Number.isFinite(endYear) ? `${endYear - 1} — ${endYear}` : String(year || '');
};

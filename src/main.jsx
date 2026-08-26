import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import 'katex/dist/katex.min.css';
import SLG_DATA from './_data/slg.json';
import {
  EVENT_CONTENT,
  EVENT_CONTENT_BY_SLUG,
  PAGE_CONTENT_BY_SLUG,
  PAST_TEST_CONTENT_BY_SLUG,
  PRESS_CONTENT,
  PRESS_CONTENT_BY_SLUG,
  slugify,
} from './content.js';
import './styles.css';

const EMAIL = 'seattleinfinitymathcircle@gmail.com';
const DISCORD_URL = 'https://discord.gg/wwyZnWB2tw';
const MAILING_LIST_URL = 'https://forms.gle/FDvWGo1FHqQSGkNK6';
const INSTAGRAM_URL = 'https://www.instagram.com/seattleinfinitymathcircle/';

const SPONSORS = [
  { name: 'Jane Street', href: 'https://www.janestreet.com/', image: '/assets/images/sponsors/jane-street-logo.png', className: 'sponsor-image-jane' },
  { name: 'AoPS Academy Bellevue', href: 'https://bellevue.aopsacademy.org/', image: '/assets/images/sponsors/aops-logo.png', className: 'sponsor-image-aops' },
  { name: 'X-Camp', href: 'https://www.x-camp.org/', image: '/assets/images/sponsors/xcamp-logo.png', className: 'sponsor-image-xcamp' },
];

const AWARDS_BY_YEAR = [
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

const TOP_THREE = new Set(['1st', '2nd', '3rd']);
const CAROUSEL_AWARDS = AWARDS_BY_YEAR.flatMap(({ awards }) => awards.filter(([, rank]) => TOP_THREE.has(rank)));

const PRESS_RELEASES = [...PRESS_CONTENT];
const PRESS_RELEASES_BY_SLUG = PRESS_CONTENT_BY_SLUG;

const EVENT_ITEMS = EVENT_CONTENT.map((event) => ({
  ...event,
  date: event.schedule || event.date,
}));
const SCHEDULE_MONTHS = {
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
const eventSortKey = (schedule) => {
  const text = String(schedule || '').toLowerCase();
  const months = [...new Set(Object.entries(SCHEDULE_MONTHS)
    .filter(([label]) => text.includes(label))
    .map(([, month]) => month))];
  const phase = text.includes('early') ? 0 : text.includes('late') ? 2 : 1;
  if (!months.length) return 120;
  return Math.min(...months.map((month) => ((month - CURRENT_MONTH + 12) % 12) * 3 + phase));
};
const UPCOMING_EVENTS = EVENT_ITEMS
  .filter(({ featured }) => featured)
  .sort((a, b) => eventSortKey(a.schedule || a.date) - eventSortKey(b.schedule || b.date));


const PEOPLE = SLG_DATA.map(({ name, title, photoURL, bio }) => ({
  name,
  role: title || '',
  image: photoURL,
  bio,
}));

const markdown = new MarkdownIt({ html: true, linkify: true, typographer: true });
const renderMarkdown = (source) => DOMPurify.sanitize(markdown.render(source || ''), {
  USE_PROFILES: { html: true },
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'rel', 'style'],
});

function MarkdownBody({ source, className = 'markdown-content' }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }} />;
}

function RichTitle({ children }) {
  return <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(String(children || '')) }} />;
}

function resolvePress(slug) {
  const key = decodeURIComponent(slug || '').replace(/^\/+|\/+$/g, '');
  return PRESS_RELEASES_BY_SLUG[key] || PRESS_RELEASES_BY_SLUG[slugify(key)];
}

function resolveEvent(slug) {
  const key = decodeURIComponent(slug || '').replace(/^\/+|\/+$/g, '');
  return EVENT_CONTENT_BY_SLUG[key] || EVENT_CONTENT_BY_SLUG[slugify(key)];
}

function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function usePath() {
  const [path, setPath] = useState(`${window.location.pathname}${window.location.search}`);
  useEffect(() => {
    const update = () => setPath(`${window.location.pathname}${window.location.search}`);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  return path.replace(/\/+$/, '') || '/';
}

function InternalLink({ href, children, className = '', ...props }) {
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        if (href.startsWith('/')) {
          event.preventDefault();
          navigate(href);
        }
      }}
      {...props}
    >
      {children}
    </a>
  );
}

function Logo({ full = false, inverse = false }) {
  return (
    <InternalLink href="/" className={`logo ${full ? 'logo-full' : 'logo-simc'} ${inverse ? 'logo-inverse' : ''}`}>
      <img src="/int.svg" alt="" aria-hidden="true" />
      <span>{full ? 'SEATTLE INFINITY MATH CIRCLE' : 'SIMC'}</span>
    </InternalLink>
  );
}

function Button({ href, children, tone = 'primary', external = false, type = 'button', ...props }) {
  const className = `button button-${tone}`;
  if (external) return <a className={className} href={href} target="_blank" rel="noreferrer" {...props}>{children}</a>;
  if (href) return <InternalLink className={className} href={href} {...props}>{children}</InternalLink>;
  return <button className={className} type={type} {...props}>{children}</button>;
}

function Header() {
  return (
    <header className="site-header">
      <Logo inverse />
      <nav className="main-nav" aria-label="Main navigation">
        <InternalLink href="/events">Events</InternalLink>
        <InternalLink href="/resources">Resources</InternalLink>
        <InternalLink href="/press-releases">Press releases</InternalLink>
        <InternalLink href="/about-us">About us</InternalLink>
        <Button href="/contact" tone="light">Contact us</Button>
      </nav>
    </header>
  );
}

function SignupBanner() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  return (
    <section className="signup-banner" aria-label="Join the SIMC community">
      <div className="signup-copy">
        <h2>Stay in the loop.</h2>
        <p>Sign up for our mailing list so you don't miss out!</p>
      </div>
      <div className="signup-spacer" aria-hidden="true" />
      <form id="banner-email-form" className="signup-form" onSubmit={(event) => { event.preventDefault(); if (email.trim()) setSubmitted(true); }}>
        <label className="sr-only" htmlFor="banner-email">Email address</label>
        <input id="banner-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setSubmitted(false); }} placeholder="your@email.com" required />
      </form>
      <button className="button button-primary" type="submit" form="banner-email-form">{submitted ? 'You\'ve been added!' : 'Join mailing list'}</button>
      <Button href={DISCORD_URL} external tone="outline">Join our Discord</Button>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <Logo full />
        <div className="footer-links">
          <InternalLink href="/contact">Mailing list</InternalLink>
          <a href={DISCORD_URL} target="_blank" rel="noreferrer">Discord</a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">Instagram</a>
        </div>
      </div>
      <div className="footer-spacer" aria-hidden="true" />
      <div className="sponsors">
        <p className="eyebrow">Sponsors</p>
        <div className="sponsor-row">
          {SPONSORS.map((sponsor) => (
            <a className="sponsor-link" key={sponsor.name} href={sponsor.href} target="_blank" rel="noreferrer" aria-label={`Visit ${sponsor.name}`}>
              <img className={`sponsor-image ${sponsor.className}`} src={sponsor.image} alt={`${sponsor.name} logo`} />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

function PageShell({ children }) {
  return <><Header />{children}<Footer /></>;
}

function SourceImage({ src, className = '', alt }) {
  if (!src) return null;
  return <img className={'source-image ' + className} src={src} alt={alt} loading="lazy" />;
}

function PressCard({ variant = 'page', title, date, description = '', image, href }) {
  return (
    <InternalLink href={href} className={'press-card press-card-' + variant}>
      {variant !== 'compact' && image && <SourceImage src={image} className="card-image" alt={title + ' source image'} />}
      <div className="card-copy">
        <p className="card-kicker">{date}</p>
        <h3><RichTitle>{title}</RichTitle></h3>
        {variant !== 'compact' && description && <p>{description}</p>}
      </div>
    </InternalLink>
  );
}

function CompactCard({ title, date, description = '', href }) {
  return <PressCard variant="compact" title={title} date={date} description={description} href={href} />;
}

function PersonCard({ name, role, bio, image }) {
  return (
    <article className="person-card">
      <SourceImage src={image} className="card-image" alt={`Photo of ${name}`} />
      <div className="card-copy">
        <h3>{name}</h3>
        {role && <p className="card-kicker">{role}</p>}
        <p>{bio}</p>
      </div>
    </article>
  );
}

function ResultsAwardItem({ competition, rank, ariaHidden = false }) {
  return (
    <div className="results-award-item" aria-hidden={ariaHidden || undefined}>
      <span className="results-rank">{rank}</span>
      <span className="results-competition">{competition}</span>
    </div>
  );
}

function ResultsYear({ year, rows, awards }) {
  return (
    <div className="results-year">
      <div className="results-year-rule"><span>{year}</span></div>
      <div className="results-awards-grid" style={{ '--results-rows': rows }}>
        {awards.map(([competition, rank]) => <ResultsAwardItem key={`${competition}-${rank}`} competition={competition} rank={rank} />)}
      </div>
    </div>
  );
}

function ResultsSection() {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className={`results-section ${expanded ? 'results-expanded' : 'results-collapsed'}`} aria-label="SIMC results">
      <div className="results-header">
        <h2 className="results-label">The most decorated team in the USA</h2>
        <div className="results-toggle-controls">
          {!expanded && <button className="results-toggle" type="button" aria-expanded="false" aria-controls="results-carousel" onClick={() => setExpanded(true)}>View all results</button>}
          {expanded && <button className="results-toggle results-close" type="button" aria-label="Show top three results" aria-expanded="true" aria-controls="results-list" onClick={() => setExpanded(false)}>×</button>}
        </div>
      </div>
      <div className="results-stage">
        <div id="results-carousel" className="results-carousel" role="region" aria-label="Top results carousel" aria-hidden={expanded || undefined}>
          <div className="results-carousel-track">
            {[0, 1].map((set) => (
              <div className="results-carousel-set" key={set}>
                {CAROUSEL_AWARDS.map(([competition, rank], index) => <ResultsAwardItem key={`${set}-${index}-${competition}-${rank}`} competition={competition} rank={rank} ariaHidden={set === 1} />)}
              </div>
            ))}
          </div>
        </div>
        <div id="results-list" className="results-awards-list" aria-hidden={!expanded || undefined}>
          {AWARDS_BY_YEAR.map((section) => <ResultsYear key={section.year} {...section} />)}
        </div>
      </div>
    </section>
  );
}

function HomeHero() {
  return (
    <div className="home-hero">
      <div className="home-support">
        <div className="home-title">
          <img src="/int.svg" alt="" aria-hidden="true" />
          <h1>Seattle Infinity Math Circle</h1>
        </div>
        <div className="hero-panel">
          <p>Our goal is to inspire students to engage in mathematics and expand their mathematical interests and capabilities.</p>
          <div className="hero-actions">
            <Button href="/contact">Join us</Button>
            <span className="hero-actions-spacer" aria-hidden="true" />
            <Button href="/about-us" tone="primary">Who are we</Button>
          </div>
        </div>
      </div>
      <img className="source-image home-hero-image" src="/assets/images/about-classroom.png" alt="Students working on math problems at a SIMC event" />
    </div>
  );
}

function HomeLatest() {
  return (
    <section className="home-latest">
      <div className="home-latest-column">
        <div className="section-title-row">
          <h2>Upcoming events</h2>
          <div className="title-spacer" />
          <Button href="/events" tone="outline">View all events</Button>
        </div>
        <div className="compact-stack">
          {UPCOMING_EVENTS.slice(0, 3).map((event) => <CompactCard key={event.slug} title={event.title} date={event.date} description={event.description} href={`/events/${event.slug}`} />)}
        </div>
      </div>
      <div className="home-latest-column">
        <div className="section-title-row">
          <h2>Latest press releases</h2>
          <div className="title-spacer" />
          <Button href="/press-releases" tone="outline">View all press releases</Button>
        </div>
        <div className="featured-press-grid">
          {PRESS_RELEASES.slice(0, 2).map((article) => <PressCard key={article.slug} variant="featured" title={article.title} date={article.date} description={article.description} image={article.image} href={`/press-releases/${article.slug}`} />)}
        </div>
      </div>
    </section>
  );
}

function HomePage() {
  return (
    <main className="home-page">
      <section className="home-dark">
        <HomeHero />
        <ResultsSection />
      </section>
      <SignupBanner />
      <HomeLatest />
    </main>
  );
}

function Intro({ title, body, className = '', children }) {
  return (
    <section className={`page-intro ${className}`}>
      <h1>{title}</h1>
      {body && <p>{body}</p>}
      {children}
    </section>
  );
}

function PressReleasesPage() {
  return (
    <main>
      <Intro title="Press releases" body="A collection of all our press releases." />
      <SignupBanner />
      <section className="press-page-list">
        <h2>Latest press releases</h2>
        <div className="press-page-grid">
          {PRESS_RELEASES.map((article) => <PressCard key={article.slug} title={article.title} date={article.date} description={article.description} image={article.image} href={`/press-releases/${article.slug}`} />)}
        </div>
      </section>
    </main>
  );
}

function EventsPage() {
  return (
    <main>
      <Intro title="Events" body="A collection of upcoming events from SIMC." />
      <SignupBanner />
      <section className="events-page-list">
        <h2>Upcoming events</h2>
        <div className="compact-grid">{UPCOMING_EVENTS.map((event) => <CompactCard key={event.slug} title={event.title} date={event.date} description={event.description} href={`/events/${event.slug}`} />)}</div>
      </section>
    </main>
  );
}

function YearRule({ children }) {
  return <div className="section-year-rule"><span>{children}</span></div>;
}

const formatTestYear = (year) => {
  const endYear = Number(year);
  return Number.isFinite(endYear) ? `${endYear - 1} — ${endYear}` : year;
};

const TEST_CATEGORY_LABELS = {
  'mock-aime': 'Mock AIME',
  'mock-amc8': 'Mock AMC 8',
  'mock-amc10': 'Mock AMC 10',
  'mock-amc12': 'Mock AMC 12',
  'mock-mathcounts': 'Mock MATHCOUNTS',
  elementary: 'Elementary competition',
  tst: 'SIMC TST',
};
const TEST_CARD_DESCRIPTIONS = {
  'mock-aime': 'A practice AIME-style test.',
  'mock-amc8': 'A practice AMC 8-style test.',
  'mock-amc10': 'A practice AMC 10-style test.',
  'mock-amc12': 'A practice AMC 12-style test.',
  'mock-mathcounts': 'A practice MATHCOUNTS competition.',
  elementary: 'A practice elementary math competition.',
  tst: 'A team selection test for math tournaments.',
};

function TestArchiveCard({ test }) {
  return (
    <InternalLink href={'/past-tests/' + test.slug} className="test-archive-card">
      <div className="test-archive-copy">
        <p className="card-kicker">{test.hosted_date}</p>
        <h3>{test.title}</h3>
        <p>{test.description || TEST_CARD_DESCRIPTIONS[test.category] || 'Competition test materials.'}</p>
      </div>
    </InternalLink>
  );
}

function ResourcesPage({ onlyTests = false }) {
  const tests = Object.values(PAST_TEST_CONTENT_BY_SLUG);
  const grouped = Array.from(new Set(tests.map((test) => Number(test.year))))
    .sort((a, b) => b - a)
    .map((year) => ({ year, tests: tests.filter((test) => Number(test.year) === year) }));
  const resources = PAGE_CONTENT_BY_SLUG.resources;
  return (
    <main>
      <Intro title={onlyTests ? 'Past tests' : 'Resources'} body={onlyTests ? 'Past SIMC tests and competition materials.' : 'Online classes, YouTube channels, books, and past tests from SIMC.'} />
      <SignupBanner />
      <section className="resources-tests">
        <h2>Past tests</h2>
        <div className="test-year-list">
          {grouped.map(({ year, tests: yearTests }) => (
            <div className="test-year" key={year}>
              <YearRule>{formatTestYear(year)}</YearRule>
              <div className="test-archive-grid">{yearTests.map((test) => <TestArchiveCard key={test.slug} test={test} />)}</div>
            </div>
          ))}
        </div>
      </section>
      {!onlyTests && <section className="resources-external">
        <h2>External resources</h2>
        <MarkdownBody source={resources.body.replace(/^#\s+.+(?:\r?\n){1,2}/, '')} />
      </section>}
    </main>
  );
}

function PastTestDetailPage({ slug }) {
  const key = decodeURIComponent(slug || '').replace(/^\/+|\/+$/g, '');
  const test = PAST_TEST_CONTENT_BY_SLUG[key] || PAST_TEST_CONTENT_BY_SLUG[slugify(key)];
  if (!test) return <NotFoundPage />;
  return (
    <main>
      <section className="announcement-hero">
        <p className="card-kicker card-kicker-light">{TEST_CATEGORY_LABELS[test.category]} · {formatTestYear(test.year)}</p>
        <h1>{test.title}</h1>
        <Button href="/past-tests" tone="light">Back to past tests</Button>
      </section>
      <article className="past-test-article">
        <h2>{test.title}</h2>
        <section className="past-test-problems">
          <h3>Problems</h3>
          {test.problemPdfs.length ? test.problemPdfs.map((material, index) => material.embedSrc
            ? <iframe key={material.embedSrc} title={test.title + ' problems PDF ' + (index + 1)} src={material.embedSrc} loading="lazy" />
            : <a key={material.href} href={material.href} target="_blank" rel="noreferrer">Open problem source</a>)
            : <p>No direct problem PDF is available in the source archive.</p>}
        </section>
        <section className="past-test-solutions">
          <h3>Solutions</h3>
          {test.solutionLinks.length
            ? test.solutionLinks.map((material, index) => <a key={material.href} href={material.href} target="_blank" rel="noreferrer">Solution {index + 1}</a>)
            : <p>No solution link is available in the source archive.</p>}
        </section>
        {test.sourceLinks.length > 0 && <section className="past-test-source">
          <h3>Source archive</h3>
          {test.sourceLinks.map((material) => <a key={material.href} href={material.href} target="_blank" rel="noreferrer">Open source folder</a>)}
        </section>}
      </article>
    </main>
  );
}

function SourceArticlePage({ article, backHref, backLabel }) {
  if (!article) return <NotFoundPage />;
  const relatedTests = (article.pastTests || []).map((slug) => PAST_TEST_CONTENT_BY_SLUG[slug]);
  return (
    <main>
      <section className="announcement-hero">
        <p className="card-kicker card-kicker-light">{article.date}</p>
        <h1><RichTitle>{article.title}</RichTitle></h1>
        <Button href={backHref} tone="light">{backLabel}</Button>
      </section>
      <SignupBanner />
      <article className="announcement-article">
        <h2><RichTitle>{article.title}</RichTitle></h2>
        {article.image && <SourceImage src={article.image} className="announcement-image" alt={article.title + ' source image'} />}
        <MarkdownBody source={article.body} />
        {relatedTests.length > 0 && <section className="article-past-tests">
          <h3>Past tests</h3>
          <div className="link-grid">{relatedTests.map((test) => <InternalLink key={test.slug} className="link-card" href={'/past-tests/' + test.slug}><h3>{test.title}</h3><p>Open test materials</p></InternalLink>)}</div>
        </section>}
      </article>
    </main>
  );
}

function AnnouncementPage() {
  return <SourceArticlePage article={resolvePress('2026-2-28-mockmathcounts')} backHref="/press-releases" backLabel="Back to press releases" />;
}

function PressDetailPage({ slug }) {
  const article = resolvePress(slug);
  return <SourceArticlePage article={article} backHref="/press-releases" backLabel="Back to press releases" />;
}

function EventDetailPage({ slug }) {
  return <SourceArticlePage article={resolveEvent(slug)} backHref="/events" backLabel="Back to events" />;
}

function MarkdownPage({ record, title, body }) {
  const pageTitle = title || record?.title || 'SIMC';
  const content = (body || record?.body || '').replace(/^#\s+.+(?:\r?\n){1,2}/, '');
  return (
    <main>
      <Intro title={pageTitle} body={record?.description} />
      <section className="source-page-content">
        <MarkdownBody source={content} />
      </section>
    </main>
  );
}

function NewslettersPage() {
  return <MarkdownPage record={PAGE_CONTENT_BY_SLUG.newsletters} />;
}

const CALENDAR_EMBEDS = [
  'https://calendar.google.com/calendar/embed?height=600&wkst=1&bgcolor=%23ffffff&ctz=America%2FLos_Angeles&showTitle=1&showCalendars=1&mode=AGENDA&src=YTkxNzhhNzU4ZGRjYjhmM2FjM2ZmNGQ1MWQ2OGNiNTcwNjdmMDUyODljZTc4YmUyNDliMDM0MWJhNmQyYzY3MUBncm91cC5jYWxlbmRhci5nb29nbGUuY29t&color=%23C0CA33',
  'https://calendar.google.com/calendar/embed?height=600&wkst=1&ctz=America%2FLos_Angeles&showPrint=0&src=YWRkcmVzc2Jvb2sjY29udGFjdHNAZ3JvdXAudi5jYWxlbmRhci5nb29nbGUuY29t&src=MDBkNmVmNGIyMWNmNWQxODI4ZmExNGM0M2M2OGQzNzYwNTkyZTY4ZTgyYzQxZGM5ODMyNmIwNWFjODVkN2FmYkBncm91cC5jYWxlbmRhci5nb29nbGUuY29t&src=YTkxNzhhNzU4ZGRjYjhmM2FjM2ZmNGQ1MWQ2OGNiNTcwNjdmMDUyODljZTc4YmUyNDliMDM0MWJhNmQyYzY3MUBncm91cC5jYWxlbmRhci5nb29nbGUuY29t&color=%2333B679&color=%23F09300&color=%23C0CA33',
];

function CalendarPage() {
  return (
    <main>
      <Intro title="Calendar" body="Upcoming SIMC events and competition dates." />
      <section className="embedded-page">
        <iframe title="SIMC calendar" src={CALENDAR_EMBEDS[0]} loading="lazy" />
      </section>
    </main>
  );
}

function PotmPage() {
  return <MarkdownPage record={PAGE_CONTENT_BY_SLUG['problems-of-the-month']} />;
}

function ContactMailingForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  return (
    <form className="contact-option" onSubmit={(event) => { event.preventDefault(); if (email.trim()) setSubmitted(true); }}>
      <h2>Join our mailing list</h2>
      <p><a href={MAILING_LIST_URL} target="_blank" rel="noreferrer">Sign up for our mailing list</a> so you don't miss out on any of our fun events!</p>
      <div className="contact-form-row">
        <label className="sr-only" htmlFor="contact-email">Email address</label>
        <input id="contact-email" type="email" placeholder="your@email.com" value={email} onChange={(event) => { setEmail(event.target.value); setSubmitted(false); }} required />
        <Button type="submit">{submitted ? 'You are in' : 'Join mailing list'}</Button>
      </div>
    </form>
  );
}

function ContactPage() {
  return (
    <main>
      <Intro title="Contact Us" className="contact-hero" />
      <section className="contact-layout">
        <div className="contact-email">
          <h2>Want to get in touch with us?</h2>
          <p>For questions, comments, or general inquiries, reach out through our <a href={DISCORD_URL} target="_blank" rel="noreferrer">Discord Server</a>. You can also email us at <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.</p>
        </div>
        <div className="contact-options-row">
          <div className="contact-option">
            <h2>Join our Discord!</h2>
            <p>Join our Discord Server to connect with the SIMC community.</p>
            <Button href={DISCORD_URL} external>Join our Discord</Button>
          </div>
          <ContactMailingForm />
        </div>
      </section>
    </main>
  );
}

function SlgPage() {
  return (
    <main>
      <section className="about-hero">
        <div className="about-copy">
          <h1>Student Leadership Group</h1>
          <div className="about-panel"><p>Our student leaders create competitions, write problems, and expand math literacy for students across the Seattle area.</p></div>
        </div>
        <img className="source-image about-image" src="/assets/images/about-classroom.png" alt="Students working on math problems at a SIMC event" />
      </section>
      <SignupBanner />
      <section className="slg-page-list">
        <h2>Meet the Student Leadership Group</h2>
        <div className="people-grid">{PEOPLE.map((person) => <PersonCard key={person.name} {...person} />)}</div>
      </section>
    </main>
  );
}

function NotFoundPage() {
  return <main><Intro title="That page is missing."><Button href="/">Back home</Button></Intro></main>;
}

function renderRoute(path) {
  if (path === '/') return HomePage;
  if (path === '/events') return EventsPage;
  if (path.startsWith('/events/')) return () => <EventDetailPage slug={path.slice('/events/'.length)} />;
  if (path.startsWith('/past-tests/')) return () => <PastTestDetailPage slug={path.slice('/past-tests/'.length)} />;
  if (path === '/resources') return ResourcesPage;
  if (path === '/mock-tests' || path === '/past-tests') return () => <ResourcesPage onlyTests />;
  if (path === '/press-releases') return PressReleasesPage;
  if (path.startsWith('/press-releases/')) return () => <PressDetailPage slug={path.slice('/press-releases/'.length)} />;
  if (path === '/announcements/mathcounts' || path === '/announcement') return AnnouncementPage;
  if (path === '/contact') return ContactPage;
  if (path === '/slg' || path === '/about' || path === '/about-us') return SlgPage;
  if (path === '/newsletters' || path === '/newsletter' || path === '/newletter') return NewslettersPage;
  if (path === '/gcalender' || path === '/calender' || path === '/calendar') return CalendarPage;
  if (path === '/potm') return PotmPage;
  return NotFoundPage;
}

function App() {
  const path = usePath();
  useEffect(() => {
    const requestedTheme = new URLSearchParams(path.split('?')[1] || '').get('theme');
    document.documentElement.dataset.theme = requestedTheme === 'dark' ? 'dark' : 'light';
  }, [path]);
  const Page = renderRoute(path.split('?')[0]);
  return <PageShell><Page /></PageShell>;
}

createRoot(document.getElementById('root')).render(<App />);

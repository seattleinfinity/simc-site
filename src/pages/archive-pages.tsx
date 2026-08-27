import { Link } from 'react-router-dom';
import { CompactCard, PressCard } from '../components/content-card';
import { MarkdownBody } from '../components/markdown-content';
import { MasonryGrid } from '../components/masonry-grid';
import { Intro, YearRule } from '../components/page-primitives';
import { SignupBanner } from '../components/site-shell';
import {
  PAGE_CONTENT_BY_SLUG,
  PAST_TEST_CONTENT_BY_SLUG,
  PRESS_CONTENT,
  type ContentRecord,
} from '../content';
import { formatTestYear, TEST_CARD_DESCRIPTIONS, UPCOMING_EVENTS } from '../data/site';

function TestArchiveCard({ test }: { test: ContentRecord }) {
  return (
    <Link to={'/past-tests/' + test.slug} className="column-card test-archive-card">
      <div className="test-archive-copy">
        <p className="card-kicker">{test.hosted_date}</p>
        <h3>{test.title}</h3>
        <p>{test.description || TEST_CARD_DESCRIPTIONS[test.category || ''] || 'Competition test materials.'}</p>
      </div>
    </Link>
  );
}

export function PressReleasesPage() {
  return (
    <main>
      <Intro title="Press releases" body="A collection of all our press releases." />
      <SignupBanner />
      <section className="press-page-list">
        <h2>Latest press releases</h2>
        <MasonryGrid
          className="press-page-grid"
          items={PRESS_CONTENT}
          renderItem={(article) => <PressCard key={article.slug} title={article.title} date={article.date} description={article.description} image={article.image} href={`/press-releases/${article.slug}`} />}
        />
      </section>
    </main>
  );
}

export function EventsPage() {
  return (
    <main>
      <Intro title="Events" body="A collection of upcoming events from SIMC." />
      <SignupBanner />
      <section className="events-page-list">
        <h2>Upcoming events</h2>
        <MasonryGrid
          className="compact-grid"
          items={UPCOMING_EVENTS}
          renderItem={(event) => <CompactCard key={event.slug} title={event.title} date={event.date} description={event.description} href={`/events/${event.slug}`} />}
        />
      </section>
    </main>
  );
}

export function ResourcesPage({ onlyTests = false }: { onlyTests?: boolean } = {}) {
  const tests = Object.values(PAST_TEST_CONTENT_BY_SLUG);
  const grouped = Array.from(new Set(tests.map((test) => Number(test.year))))
    .sort((a, b) => b - a)
    .map((year) => ({
      year,
      tests: tests
        .filter((test) => Number(test.year) === year)
        .sort((a, b) => (Date.parse(b.hosted_date || '') || 0) - (Date.parse(a.hosted_date || '') || 0) || a.title.localeCompare(b.title)),
    }));
  const resources = PAGE_CONTENT_BY_SLUG.resources;
  const resourceItems = (resources?.body || '')
    .replace(/^#\s+.+(?:\r?\n){1,2}/, '')
    .split(/\r?\n/)
    .map((line) => /^\s*-\s+(.+)$/.exec(line)?.[1])
    .filter((item): item is string => Boolean(item));
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
              <MasonryGrid
                className="test-archive-grid"
                items={yearTests}
                gap={16}
                renderItem={(test) => <TestArchiveCard key={test.slug} test={test} />}
              />
            </div>
          ))}
        </div>
      </section>
      {!onlyTests && <section className="resources-external">
        <h2>External resources</h2>
        <MasonryGrid
          className="resource-grid"
          items={resourceItems}
          renderItem={(item, index) => <div className="column-card resource-card" key={`${item}-${index}`}><MarkdownBody source={item} /></div>}
        />
      </section>}
    </main>
  );
}

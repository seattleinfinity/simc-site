import { Link, useParams } from 'react-router-dom';
import { PressCard, SourceImage } from '../components/content-card';
import { MarkdownBody, RichTitle } from '../components/markdown-content';
import { MasonryGrid } from '../components/masonry-grid';
import { Button, SignupBanner } from '../components/site-shell';
import {
  EVENT_CONTENT_BY_SLUG,
  findContentRecord,
  PAST_TEST_CONTENT_BY_SLUG,
  PRESS_CONTENT_BY_SLUG,
  type ContentRecord,
} from '../content';
import { formatTestYear, TEST_CATEGORY_LABELS } from '../data/site';
import { NotFoundPage } from './static-pages';

export function PastTestDetailPage() {
  const { slug } = useParams<'slug'>();
  const test = findContentRecord(PAST_TEST_CONTENT_BY_SLUG, slug);
  if (!test) return <NotFoundPage />;
  return (
    <main>
      <section className="announcement-hero">
        <p className="card-kicker card-kicker-light">{TEST_CATEGORY_LABELS[test.category || ''] || 'SIMC test'} · {formatTestYear(test.year)}</p>
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

interface SourceArticlePageProps {
  article?: ContentRecord;
  backHref: string;
  backLabel: string;
}

function SourceArticlePage({ article, backHref, backLabel }: SourceArticlePageProps) {
  if (!article) return <NotFoundPage />;
  const relatedTests = article.pastTests
    .map((slug) => PAST_TEST_CONTENT_BY_SLUG[slug])
    .filter((test): test is ContentRecord => Boolean(test));
  const relatedPressReleases = article.pressReleases
    .map((slug) => PRESS_CONTENT_BY_SLUG[slug])
    .filter((release): release is ContentRecord => Boolean(release));
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
        {(relatedPressReleases.length > 0 || relatedTests.length > 0) && <section className="article-related">
          {relatedPressReleases.length > 0 && <>
            <h3>Press releases</h3>
            <MasonryGrid
              className="link-grid"
              items={relatedPressReleases}
              getItemKey={(release) => release.slug}
              renderItem={(release) => <PressCard variant="compact" title={release.title} date={release.date} href={'/press-releases/' + release.slug} />}
            />
          </>}
          {relatedTests.length > 0 && <>
            <h3>Past tests</h3>
            <MasonryGrid
              className="link-grid"
              items={relatedTests}
              getItemKey={(test) => test.slug}
              renderItem={(test) => <Link className="column-card link-card" to={'/past-tests/' + test.slug}><h3>{test.title}</h3><p>Open test materials</p></Link>}
            />
          </>}
        </section>}
      </article>
    </main>
  );
}

export function AnnouncementPage() {
  return <SourceArticlePage article={PRESS_CONTENT_BY_SLUG['2026-2-28-mockmathcounts']} backHref="/press-releases" backLabel="Back to press releases" />;
}

export function PressDetailPage() {
  const { slug } = useParams<'slug'>();
  const article = findContentRecord(PRESS_CONTENT_BY_SLUG, slug);
  return <SourceArticlePage article={article} backHref="/press-releases" backLabel="Back to press releases" />;
}

export function EventDetailPage() {
  const { slug } = useParams<'slug'>();
  return <SourceArticlePage article={findContentRecord(EVENT_CONTENT_BY_SLUG, slug)} backHref="/events" backLabel="Back to events" />;
}
